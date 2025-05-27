import * as vscode from 'vscode';

interface FileItem extends vscode.QuickPickItem {
  uri: vscode.Uri;
  isStaged: boolean;
  resourceUri?: vscode.Uri;
}

export async function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('extension.showChangedFiles', async () => {
    const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
    if (!gitExtension) {
      vscode.window.showErrorMessage('Git extension not found');
      return;
    }
    const git = gitExtension.getAPI(1);
    const repo = git.repositories[0];
    if (!repo) {
      vscode.window.showErrorMessage('No git repository found');
      return;
    }

    const stagedFiles = repo.state.indexChanges.map((change: any) => change.uri);
    const changedFiles = repo.state.workingTreeChanges.map((change: any) => change.uri);

    if (stagedFiles.length === 0 && changedFiles.length === 0) {
      vscode.window.showInformationMessage('No changed or staged files found.');
      return;
    }

    const quickPick = vscode.window.createQuickPick<FileItem>();
    quickPick.matchOnDescription = true;
    quickPick.placeholder = 'Select a changed or staged file';

    const items: FileItem[] = [];

    changedFiles.forEach((uri: vscode.Uri, index: number) => {
      items.push({
        label: `${index + 1}. ${vscode.workspace.asRelativePath(uri).split('.').pop()?.slice(0, 5)}\t\t${vscode.workspace.asRelativePath(uri)}`,
        description: "",
        uri,
        isStaged: false,
        resourceUri: uri,
      });
    });

    stagedFiles.forEach((uri: vscode.Uri, index: number) => {
      items.push({
        label: `${changedFiles.length + index + 1}. ${vscode.workspace.asRelativePath(uri).split('.').pop()?.slice(0, 5)}\t\t${vscode.workspace.asRelativePath(uri)}`,
        description: "🟢",  
        uri,
        isStaged: true,
        resourceUri: uri,
      });
    });

    quickPick.items = items;

    quickPick.onDidAccept(() => {
      const selection = quickPick.selectedItems[0];
      if (selection) {
        vscode.window.showTextDocument(selection.uri, { preview: false });
        quickPick.hide();
      }
    });

    quickPick.onDidHide(() => quickPick.dispose());

    quickPick.show();
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
