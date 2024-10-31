import * as path from 'path';

import { Dirent, Stats, readdir } from 'fs';
import { stat, } from 'node:fs/promises';

const directoryPath = "/var/home/goneri/git_repos/cloud-init-bsd-testing/";
const collectionsPath = directoryPath + "collections/ansible_collections/";


function namespaceCallback(err, dirents: Dirent[]) {
    dirents
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => {
            const namespaceName = dirent.name;
            const namespaceDirectory = path.join(dirent.parentPath, namespaceName);
            let collectionCallback = (error, dirents: Dirent[]) => {
                dirents
                    .filter((dirent) => dirent.isDirectory())
                    .map((dirent) => {const manifestFile = path.join(dirent.parentPath, dirent.name, "MANIFEST.json"); return {dirent, manifestFile}})
                    .map(({dirent, manifestFile}) =>{console.log(`${namespaceName}.${dirent.name}`);});
            }



            readdir(namespaceDirectory, {withFileTypes: true}, collectionCallback);


        });
}



readdir(collectionsPath, {withFileTypes: true}, namespaceCallback);

//        files.filter((file)) => { nodeFsPromise.stat(collectionsPath + file).then((statInfo) => {})) });
        //listing all files using forEach



    // forEach((namespaceDirectory) => {
    //         // Do whatever you want to do with the file
    //         console.log(namespaceDirectory);

    //         if (fs.lstatSync(namespaceDirectory).isDirectory()) {
    //             console.log(`${namespaceDirectory} is a directory!`);

    //             fs.readdir(namespaceDirectory, function (error, files) {
    //                 console.log(`files: ${files}`)

    //             });
    //         }

    //     })
    // .then((files) => )
    // .catch((error) => {
    //     return console.log('Unable to scan directory: ' + error);
    // });
