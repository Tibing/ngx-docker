import { Tree } from '@angular-devkit/schematics';

import { readJSON, writeJSON } from './file';


const packageJsonName = 'package.json';

interface PackageJson {
  name: string;
  version: string;
  dependencies: { [key: string]: string };
  devDependencies: { [key: string]: string };
  peerDependencies: { [key: string]: string };
}

export function getProjectName(): string {
  return getPackageJson().name;
}

export function getVersion(): string {
  return getPackageJson().version;
}

export function getPeerDependencyVersionFromPackageJson(packageName: string): string {
  const packageJson: PackageJson = getPackageJson();

  if (noInfoAboutPeerDependency(packageJson, packageName)) {
    throwNoPackageInfoInPackageJson(packageName);
  }

  return packageJson.peerDependencies[packageName];
}

export function addDevDependencyToPackageJson(tree: Tree, packageName: string, packageVersion: string) {
  if (!tree.exists(packageJsonName)) {
    throwNoPackageJsonError();
  }

  const packageJson: PackageJson = readJSON(tree, packageJsonName);

  if (!packageJson.devDependencies) {
    packageJson.devDependencies = {};
  }

  if (!packageJson.devDependencies[packageName]) {
    packageJson.devDependencies[packageName] = packageVersion;
    packageJson.devDependencies = sortObjectByKeys(packageJson.devDependencies);
  }

  writeJSON(tree, packageJsonName, packageJson);
}

function throwNoPackageJsonError() {
  throw new Error('No package.json found in the tree.');
}

function throwNoPackageInfoInPackageJson(packageName: string) {
  throw new Error(`No info found in package.json for ${packageName}`);
}

/**
 * Validates packageJson has peerDependencies, also as specified peerDependency not exists.
 * */
function noInfoAboutPeerDependency(packageJson: PackageJson, packageName: string): boolean {
  return !peerDependencyAlreadyExists(packageJson, packageName);
}

/**
 * Validates packageJson has peerDependencies, also as specified peerDependency exists.
 * */
function peerDependencyAlreadyExists(packageJson: PackageJson, packageName: string): boolean {
  return !!(packageJson.peerDependencies && packageJson.peerDependencies[packageName]);
}

/**
 * Sorts the keys of the given object.
 * @returns A new object instance with sorted keys
 */
function sortObjectByKeys(obj: object) {
  return Object.keys(obj).sort().reduce((result, key) => (result[key] = obj[key]) && result, {});
}

function getPackageJson(): PackageJson {
  return require('../../package.json');
}
