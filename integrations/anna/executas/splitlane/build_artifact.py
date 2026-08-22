"""Build the deterministic, self-contained Linux archive for Anna Cloud Agents."""

from __future__ import annotations

import io
import gzip
import json
from pathlib import Path
import subprocess
import tarfile


ROOT = Path(__file__).resolve().parent
TARGET = "x86_64-unknown-linux-musl"
BINARY = ROOT / "target" / TARGET / "release" / "splitlane"


def _manifest_version() -> str:
    manifest = json.loads((ROOT / "executa.json").read_text(encoding="utf-8"))
    return str(manifest["version"])


def _build_binary() -> bytes:
    subprocess.run(
        ["cargo", "build", "--locked", "--release", "--target", TARGET],
        cwd=ROOT,
        check=True,
    )
    data = BINARY.read_bytes()
    if not data.startswith(b"\x7fELF"):
        raise RuntimeError(f"Expected a Linux ELF executable at {BINARY}")
    return data


def _add_file(archive: tarfile.TarFile, name: str, data: bytes, mode: int) -> None:
    info = tarfile.TarInfo(name)
    info.size = len(data)
    info.mode = mode
    info.mtime = 0
    info.uid = 0
    info.gid = 0
    info.uname = ""
    info.gname = ""
    archive.addfile(info, io.BytesIO(data))


def build() -> Path:
    binary = _build_binary()
    output = ROOT / "dist" / f"splitlane-{_manifest_version()}-linux-x86_64.tar.gz"
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("wb") as raw:
        with gzip.GzipFile(filename="", mode="wb", fileobj=raw, compresslevel=9, mtime=0) as compressed:
            with tarfile.open(fileobj=compressed, mode="w") as archive:
                _add_file(archive, "splitlane", binary, 0o755)
    return output


if __name__ == "__main__":
    print(build())
