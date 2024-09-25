
## Creating a Release

To create a beta version

```shell
pnpm version prerelease --preid beta 
git push --tags
```

This will start the GH Action for releases, create a draft release with the tag.


