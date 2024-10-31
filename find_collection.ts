import * as path from "path";
import * as YAML from "yaml";

import { Dir, Dirent, Stats } from "fs";
import { readdir, readFile } from "node:fs/promises";

class AnsibleCollection {
  path: string;
  namespace: string;
  name: string;

  constructor(path, namespace, name) {
    this.path = path;
    this.namespace = namespace;
    this.name = name;
  }
}

class CollectionFinder {
  cache: AnsibleCollection[];
  workspacePath: string;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
  }

  async readCollectionMetaInformation(collectionPath: string) {
    const galaxyFile = path.join(collectionPath, "galaxy.yml");
    let fromGalaxyFile = readFile(galaxyFile, "utf8")
      .then((content) => YAML.parse(content))
      .then((info) => {
        return { namespace: info["namespace"], name: info["name"] };
      });

    const MANIFESTFile = path.join(collectionPath, "MANIFEST.json");
    let fromMANIFESTFile = readFile(MANIFESTFile, "utf8")
      .then((content) => JSON.parse(content))
      .then((info) => {
        return {
          namespace: info["collection_info"]["namespace"],
          name: info["collection_info"]["name"],
        };
      });

    const j = Promise.any([fromGalaxyFile, fromMANIFESTFile])
      .then((info) => {
        const shouldEndWith = `${info["namespace"]}/${info["name"]}`;
        if (!collectionPath.endsWith(`${info["namespace"]}/${info["name"]}`)) {
          console.log(
            `collect name and path mismatch: ${collectionPath} Vs ${shouldEndWith}`,
          );
        }
        return new AnsibleCollection(
          collectionPath,
          info["namespace"],
          info["name"],
        );
      })
      .catch((e) => {
        console.debug(
          `Cannot find collection meta information in directory ${collectionPath}`,
        );
        return null;
      });
    return j;
  }

  async searchNestedCollections() {
    const collectionsPath = path.join(
      this.workspacePath,
      "collections/ansible_collections/",
    );
    let a = await readdir(collectionsPath, { withFileTypes: true })
      .then((namespaceDirectories: Dirent[]) => {
        return namespaceDirectories
          .filter((namespaceEntry) => namespaceEntry.isDirectory())
          .map((namespaceEntry) => {
            const namespaceName = namespaceEntry.name;
            const namespaceDirectory = path.join(
              namespaceEntry.parentPath,
              namespaceName,
            );
            return readdir(namespaceDirectory, { withFileTypes: true }).then(
              (collectionDirectories: Dirent[]) => {
                return collectionDirectories
                  .filter((entry) => entry.isDirectory())
                  .map((entry) =>
                    this.readCollectionMetaInformation(
                      path.join(entry.path, entry.name),
                    ),
                  );
              },
            );
          });
      })
      .catch((e) => {
        console.debug(`Cannot open directory ${collectionsPath}`);
        return [];
      });
    let r: AnsibleCollection[] = [];
    for (let i = 0; i < a.length; i++) {
      (await Promise.all(await a[i])).forEach((entry) => {
        if (entry instanceof AnsibleCollection) {
          r.push(entry);
        }
      });
    }
    return r;
  }

  async refreshCache() {
    let scanCollectionWorkspace = await this.readCollectionMetaInformation(
      this.workspacePath,
    );
    let scanPlaybookWorkspace = await this.searchNestedCollections();
    if (scanCollectionWorkspace) {
      this.cache = [scanCollectionWorkspace];
    } else {
      this.cache = scanPlaybookWorkspace;
    }
    console.log(this.cache);
  }
}

let collectionFinder = new CollectionFinder(
  "/var/home/goneri/git_repos/cloud-init-bsd-testing",
);
collectionFinder.refreshCache();

let collectionFinderHome = new CollectionFinder("/var/home/goneri/.ansible/");
collectionFinderHome.refreshCache();

let collectionFinderWorkspace = new CollectionFinder(
  "/var/home/goneri/git_repos/cloud-init-bsd-testing/collections/ansible_collections/community/general",
);
collectionFinderWorkspace.refreshCache();
