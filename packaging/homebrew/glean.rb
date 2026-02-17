class Glean < Formula
  desc "Clean noisy HTML into compact markdown for LLM context"
  homepage "https://github.com/mtrifilo/glean"
  license "MIT"
  version "0.1.3"

  url "https://github.com/mtrifilo/glean/archive/refs/tags/v0.1.3.tar.gz"
  sha256 "65bc8b0d0b019aaabb8f6eb362b83c7fde98a6d040709b9f26ffe53259df8f10"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/mtrifilo/glean/releases/download/v0.1.3/glean-darwin-arm64"
      sha256 "1b4c2e130df6ab6c15db42f231df62d011d056e653bd06deeee1785b8edeab34"
    end
  end

  on_linux do
    if Hardware::CPU.intel?
      url "https://github.com/mtrifilo/glean/releases/download/v0.1.3/glean-linux-x64"
      sha256 "b1abbeff5c24691713366fa928224931aeea78af469e31014e5d1051f89fe79e"
    end
  end

  def install
    binary_name =
      if OS.mac? && Hardware::CPU.arm?
        "glean-darwin-arm64"
      elsif OS.linux? && Hardware::CPU.intel?
        "glean-linux-x64"
      else
        odie <<~EOS
          Prebuilt binaries are currently available for:
            - macOS arm64
            - Linux x64
            - Windows x64 (via Scoop/installer)

          For unsupported platforms, use source install:
            bun install
            bun link
        EOS
      end

    bin.install binary_name => "glean"
  end

  test do
    assert_match "Usage: glean", shell_output("#{bin}/glean --help")
  end
end
