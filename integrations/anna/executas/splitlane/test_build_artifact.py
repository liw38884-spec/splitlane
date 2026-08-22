import tarfile
import unittest
from hashlib import sha256
from struct import unpack_from

from build_artifact import build


class AnnaArtifactTests(unittest.TestCase):
    def test_archive_contains_a_self_contained_linux_executable(self):
        artifact = build()
        with tarfile.open(artifact, "r:gz") as archive:
            members = {member.name: member for member in archive.getmembers()}
            self.assertEqual(set(members), {"splitlane"})
            self.assertEqual(members["splitlane"].mode, 0o755)
            executable = archive.extractfile("splitlane")
            self.assertIsNotNone(executable)
            binary = executable.read()
            self.assertEqual(binary[:4], b"\x7fELF")
            self.assertEqual(binary[4:6], b"\x02\x01")  # 64-bit, little-endian
            self.assertEqual(unpack_from("<H", binary, 18)[0], 62)  # x86-64

            program_header_offset = unpack_from("<Q", binary, 32)[0]
            program_header_size = unpack_from("<H", binary, 54)[0]
            program_header_count = unpack_from("<H", binary, 56)[0]
            program_header_types = {
                unpack_from("<I", binary, program_header_offset + index * program_header_size)[0]
                for index in range(program_header_count)
            }
            self.assertNotIn(3, program_header_types)  # PT_INTERP: no dynamic loader dependency

        first_hash = sha256(artifact.read_bytes()).hexdigest()
        self.assertEqual(first_hash, sha256(build().read_bytes()).hexdigest())


if __name__ == "__main__":
    unittest.main()
