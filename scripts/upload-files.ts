/**
 * npm run shopify:upload-files -- <path> [<path> …] [--alt "text"]
 *
 * Uploads local image/video files to Shopify Files (Content → Files) through
 * a staged upload, waits until Shopify has processed each one, and prints its
 * GID — ready to paste into a scripts/pdp-content/<handle>.ts field such as
 * `custom.ugc_media` (Customer photos & videos). Uploading only adds to the Files library; nothing shows on the
 * storefront until a metafield references the file.
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { colors, fatal, heading, info, success } from "./bootstrap";

type UserError = { field?: string[]; message: string };

const MIME: Record<string, { mime: string; resource: "VIDEO" | "IMAGE"; content: "VIDEO" | "IMAGE" }> = {
  ".mp4": { mime: "video/mp4", resource: "VIDEO", content: "VIDEO" },
  ".mov": { mime: "video/quicktime", resource: "VIDEO", content: "VIDEO" },
  ".webm": { mime: "video/webm", resource: "VIDEO", content: "VIDEO" },
  ".jpg": { mime: "image/jpeg", resource: "IMAGE", content: "IMAGE" },
  ".jpeg": { mime: "image/jpeg", resource: "IMAGE", content: "IMAGE" },
  ".png": { mime: "image/png", resource: "IMAGE", content: "IMAGE" },
  ".webp": { mime: "image/webp", resource: "IMAGE", content: "IMAGE" },
};

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const altIndex = args.indexOf("--alt");
  const alt = altIndex >= 0 ? args[altIndex + 1] ?? "" : "";
  const files = args.filter((arg, i) => !arg.startsWith("--") && (altIndex < 0 || i !== altIndex + 1));
  if (files.length === 0) fatal('Usage: npm run shopify:upload-files -- <path> [<path> …] [--alt "text"]');

  const { adminRequest } = await import("@/lib/shopify/admin");
  const check = (label: string, errors: UserError[] | undefined) => {
    if (errors?.length) throw new Error(`${label}: ${errors.map((e) => e.message).join("; ")}`);
  };

  heading(`Uploading ${files.length} file(s) to Shopify`);
  const created: { file: string; id: string }[] = [];

  for (const file of files) {
    const type = MIME[path.extname(file).toLowerCase()];
    if (!type) fatal(`Unsupported file type: ${file}`);
    const bytes = await readFile(file);
    const size = (await stat(file)).size;
    const filename = path.basename(file);

    // 1. Ask Shopify where to put the bytes.
    const staged = await adminRequest<{
      stagedUploadsCreate: {
        stagedTargets: { url: string; resourceUrl: string; parameters: { name: string; value: string }[] }[];
        userErrors: UserError[];
      };
    }>({
      query: /* GraphQL */ `
        mutation Stage($input: [StagedUploadInput!]!) {
          stagedUploadsCreate(input: $input) {
            stagedTargets { url resourceUrl parameters { name value } }
            userErrors { field message }
          }
        }
      `,
      variables: {
        input: [{ filename, mimeType: type.mime, resource: type.resource, fileSize: String(size), httpMethod: "POST" }],
      },
    });
    check(`stagedUploadsCreate ${filename}`, staged.stagedUploadsCreate.userErrors);
    const target = staged.stagedUploadsCreate.stagedTargets[0]!;

    // 2. Upload the bytes to that target (form fields first, file last).
    const form = new FormData();
    for (const { name, value } of target.parameters) form.append(name, value);
    form.append("file", new Blob([bytes], { type: type.mime }), filename);
    const upload = await fetch(target.url, { method: "POST", body: form });
    if (!upload.ok) throw new Error(`Upload of ${filename} failed: ${upload.status} ${await upload.text()}`);

    // 3. Register it as a Shopify file.
    const createdFile = await adminRequest<{
      fileCreate: { files: { id: string }[]; userErrors: UserError[] };
    }>({
      query: /* GraphQL */ `
        mutation Create($files: [FileCreateInput!]!) {
          fileCreate(files: $files) { files { id } userErrors { field message } }
        }
      `,
      variables: { files: [{ originalSource: target.resourceUrl, contentType: type.content, alt: alt || undefined }] },
    });
    check(`fileCreate ${filename}`, createdFile.fileCreate.userErrors);
    const id = createdFile.fileCreate.files[0]!.id;
    info(`  ${filename} → ${id} (processing…)`);
    created.push({ file, id });
  }

  // 4. Wait for Shopify to finish processing (videos take a little while).
  const deadline = Date.now() + 10 * 60_000;
  let pending = created.map((c) => c.id);
  while (pending.length && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const data = await adminRequest<{ nodes: ({ id: string; fileStatus: string } | null)[] }>({
      query: `query ($ids: [ID!]!) { nodes(ids: $ids) { ... on File { id fileStatus } } }`,
      variables: { ids: pending },
    });
    for (const node of data.nodes) {
      if (!node) continue;
      if (node.fileStatus === "FAILED") fatal(`Shopify failed to process ${node.id}`);
    }
    pending = data.nodes.filter((n) => n && n.fileStatus !== "READY").map((n) => n!.id);
  }
  if (pending.length) fatal(`Still processing after 10 minutes: ${pending.join(", ")}`);

  success("All files ready");
  for (const { file, id } of created) console.log(`  ${path.basename(file)}  ${colors.dim}${id}${colors.reset}`);
}

main().catch(fatal);
