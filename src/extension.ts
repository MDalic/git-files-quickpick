import * as vscode from 'vscode';
import * as fs from 'fs';
interface FileItem extends vscode.QuickPickItem {
  uri: vscode.Uri;
  isStaged: boolean;
  resourceUri?: vscode.Uri;
}
enum GitChangeStatus {
  INDEX_ADDED = 0,
  ADDED = 1,
  DELETED = 2,
  INDEX_DELETED = 3,
  RENAMED = 4,
  INDEX_MODIFIED = 5,
  MODIFIED = 6,
  UNTRACKED = 7
}
export interface Change {
  readonly uri: vscode.Uri;
  readonly originalUri: vscode.Uri;
  readonly renameUri?: vscode.Uri;
  readonly status: GitChangeStatus;
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

    const stagedChanges = repo.state.indexChanges;
    const unstagedChanges = repo.state.workingTreeChanges;

    if (stagedChanges.length === 0 && unstagedChanges.length === 0) {
      vscode.window.showInformationMessage('No changed or staged files found.');
      return;
    }

    const quickPick = vscode.window.createQuickPick<FileItem>();
    quickPick.matchOnDescription = true;
    quickPick.placeholder = 'Select a changed or staged file';

    const items: FileItem[] = [];

    const formatStatus = (status: number, uri: vscode.Uri): string => {
      const fileExists = fs.existsSync(uri.fsPath);

      if (status === GitChangeStatus.MODIFIED && !fileExists) {
        return '🗑️ Deleted';
      }

      switch (status) {
        case GitChangeStatus.DELETED:
        case GitChangeStatus.INDEX_DELETED:
          return '🗑️ Deleted';

        case GitChangeStatus.MODIFIED:
        case GitChangeStatus.INDEX_MODIFIED:
          return '📝 Modified';

        case GitChangeStatus.ADDED:
        case GitChangeStatus.UNTRACKED:
        case GitChangeStatus.INDEX_ADDED:
          return '➕ Added';

        case GitChangeStatus.RENAMED:
          return '🔀 Renamed';

        default:
          return '';
      }
    };

    unstagedChanges.forEach((change: Change, index: number) => {
      const uri = change.uri;
      const labelIndex = index + 1;
      items.push({
        label: `${labelIndex}. ${vscode.workspace.asRelativePath(uri).split('.').pop()?.slice(0, 5).padEnd(5)}\t\t${vscode.workspace.asRelativePath(uri)}`,
        description: `${formatStatus(change.status, uri)}`,
        uri,
        isStaged: false,
        resourceUri: uri,
      });
    });

    stagedChanges.forEach((change: Change, index: number) => {
      const uri = change.uri;
      const labelIndex = unstagedChanges.length + index + 1;
      items.push({
        label: `${labelIndex}. ${vscode.workspace.asRelativePath(uri).split('.').pop()?.slice(0, 5).padEnd(5)}\t\t${vscode.workspace.asRelativePath(uri)}`,
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

export function deactivate() { }
