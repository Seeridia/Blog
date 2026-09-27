import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('deploy', Path(__file__).parents[1] / 'scripts/activate-release.py')
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)


class ReleaseTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.target = Path(self.tmp.name) / 'site'

    def stage(self, name, extra=None):
        root = Path(f'{self.target}.deploy') / name / 'dist'
        files = {name: b'content' for name in ['index.html', '404.html', 'rss.xml', 'sitemap-index.xml', 'pagefind/pagefind.js']}
        files.update(extra or {})
        for name, content in files.items():
            path = root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
        (root / 'build-manifest.json').write_text(json.dumps({'files': {name: hashlib.sha256(content).hexdigest() for name, content in files.items()}}))
        return root

    def test_switch_removes_old_routes_and_supports_rollback(self):
        self.stage('first', {'deleted-post/index.html': b'old'})
        deploy.activate(self.target, 'first')
        first = self.target.resolve()
        self.stage('second', {'new-post/index.html': b'new'})
        deploy.activate(self.target, 'second')
        self.assertFalse((self.target / 'deleted-post').exists())
        self.assertTrue((self.target / 'new-post/index.html').is_file())
        deploy.rollback(self.target)
        self.assertEqual(self.target.resolve(), first)

    def test_bad_upload_cannot_replace_live_release(self):
        self.stage('first')
        deploy.activate(self.target, 'first')
        first = self.target.resolve()
        incoming = self.stage('broken')
        (incoming / 'index.html').write_text('partial upload')
        with self.assertRaises(ValueError):
            deploy.activate(self.target, 'broken')
        self.assertEqual(self.target.resolve(), first)

    def test_existing_directory_is_never_overwritten(self):
        self.target.mkdir()
        (self.target / 'keep.txt').write_text('existing site')
        self.stage('first')
        with self.assertRaises(ValueError):
            deploy.activate(self.target, 'first')
        self.assertEqual((self.target / 'keep.txt').read_text(), 'existing site')

    def test_missing_search_index_is_rejected(self):
        incoming = self.stage('missing')
        data = json.loads((incoming / 'build-manifest.json').read_text())
        del data['files']['pagefind/pagefind.js']
        (incoming / 'build-manifest.json').write_text(json.dumps(data))
        with self.assertRaises(ValueError):
            deploy.activate(self.target, 'missing')
        self.assertFalse(self.target.exists())


if __name__ == '__main__':
    unittest.main()
