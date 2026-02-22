import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

function assertMacOS(): void {
  if (process.platform !== "darwin") {
    throw new Error(
      "RTF/DOC conversion requires macOS (textutil). On other platforms, convert to HTML first.",
    );
  }
}

export async function convertRtfToHtml(rtf: string): Promise<string> {
  assertMacOS();

  const proc = Bun.spawn(
    ["textutil", "-stdin", "-stdout", "-convert", "html", "-format", "rtf"],
    {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    },
  );

  proc.stdin.write(rtf);
  proc.stdin.end();

  const [exitCode, html, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  if (exitCode !== 0) {
    throw new Error(
      `textutil RTF conversion failed (exit ${exitCode}): ${stderr.trim() || "unknown error"}`,
    );
  }

  return html;
}

export async function convertDocToHtml(filePath: string): Promise<string> {
  assertMacOS();

  const proc = Bun.spawn(
    ["textutil", "-convert", "html", "-stdout", filePath],
    {
      stdout: "pipe",
      stderr: "pipe",
    },
  );

  const [exitCode, html, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  if (exitCode !== 0) {
    throw new Error(
      `textutil DOC conversion failed (exit ${exitCode}): ${stderr.trim() || "unknown error"}`,
    );
  }

  return html;
}

export async function convertDocxToHtml(
  buffer: Uint8Array,
  options?: { verbose?: boolean },
): Promise<string> {
  try {
    const result = await mammoth.convertToHtml({ buffer: Buffer.from(buffer) });

    if (options?.verbose && result.messages.length > 0) {
      for (const msg of result.messages) {
        process.stderr.write(`mammoth: [${msg.type}] ${msg.message}\n`);
      }
    }

    return result.value;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `DOCX conversion failed: ${message}. Ensure the file is a valid .docx document.`,
    );
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function convertPdfToHtml(
  buffer: Uint8Array,
  options?: { verbose?: boolean },
): Promise<string> {
  try {
    const doc = await getDocumentProxy(buffer);

    if (options?.verbose) {
      process.stderr.write(`pdf: ${doc.numPages} page(s)\n`);
    }

    const result = await extractText(doc, { mergePages: false });
    const text = (result.text as string[]).join("\n\n");

    if (!text.trim()) {
      return "<!-- PDF contained no extractable text (scanned/image PDF?) -->";
    }

    const paragraphs = text.split(/\n\n+/);
    const htmlParagraphs = paragraphs
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`);

    return htmlParagraphs.join("\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `PDF conversion failed: ${message}. Ensure the file is a valid PDF document.`,
    );
  }
}
