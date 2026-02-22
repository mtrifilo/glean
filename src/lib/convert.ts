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
