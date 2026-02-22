class Decant < Formula
  desc "Clean noisy HTML into compact markdown for LLM context"
  homepage "https://github.com/mtrifilo/decant"
  license "MIT"
  version "0.1.3"

  url "https://github.com/mtrifilo/decant/archive/refs/tags/v0.1.3.tar.gz"
  sha256 "65bc8b0d0b019aaabb8f6eb362b83c7fde98a6d040709b9f26ffe53259df8f10"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/mtrifilo/decant/releases/download/v0.1.3/decant-darwin-arm64"
      sha256 "1b4c2e130df6ab6c15db42f231df62d011d056e653bd06deeee1785b8edeab34"
    end
  end

  on_linux do
    if Hardware::CPU.intel?
      url "https://github.com/mtrifilo/decant/releases/download/v0.1.3/decant-linux-x64"
      sha256 "b1abbeff5c24691713366fa928224931aeea78af469e31014e5d1051f89fe79e"
    end
  end

  def install
    binary_name =
      if OS.mac? && Hardware::CPU.arm?
        "decant-darwin-arm64"
      elsif OS.linux? && Hardware::CPU.intel?
        "decant-linux-x64"
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

    bin.install binary_name => "decant"
  end

  test do
    assert_match "Usage: decant", shell_output("#{bin}/decant --help")
  end
end
