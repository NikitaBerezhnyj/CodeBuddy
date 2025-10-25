"use strict";
import * as vscode from "vscode";

let typingTimeout: NodeJS.Timeout | null = null;

export function activate(context: vscode.ExtensionContext) {
  console.log("Extension activated");

  const provider = new CustomSidebarViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(CustomSidebarViewProvider.viewType, provider)
  );

  vscode.workspace.onDidChangeTextDocument(
    event => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && event.document === activeEditor.document) {
        provider.updateWebviewImage("4", "...");

        if (typingTimeout) {
          clearTimeout(typingTimeout);
        }

        typingTimeout = setTimeout(() => {
          provider.updateWebviewImageBasedOnErrors();
        }, 500);
      }
    },
    null,
    context.subscriptions
  );
}

class CustomSidebarViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "code-buddy.openview";
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext<unknown>,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this.getHtmlContent(webviewView.webview, "0");
  }

  updateWebviewImage(imageNumber: string, message: string = ""): void {
    if (!this._view) {
      return;
    }
    this._view.webview.html = this.getHtmlContent(this._view.webview, imageNumber, message);
  }

  updateWebviewImageBasedOnErrors(): void {
    const [errors] = getNumErrors();
    let imageIndex = "0";
    if (errors > 0 && errors < 5) {
      imageIndex = "1";
    } else if (errors >= 5 && errors < 10) {
      imageIndex = "2";
    } else if (errors >= 10) {
      imageIndex = "3";
    }

    this.updateWebviewImage(imageIndex);
  }

  private getHtmlContent(webview: vscode.Webview, i: string, message: string = ""): string {
    const stylesheetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", "main.css")
    );

    const codeBuddyFace = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", `codeBuddy${i}.png`)
    );

    const [errorNum, errorWar] = getNumErrors();
    const config = vscode.workspace.getConfiguration("Code Buddy Sidekick");
    const errorUseWarnings = config.get<boolean>("error.usewarnings");

    const displayMessage =
      message || (errorNum > 0 ? getRandomErrorMessage(errorNum) : getRandomSuccessMessage());

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <link rel="stylesheet" href="${stylesheetUri}" />
        </head>
        <body>
          <section>
            <h2 class="${message ? "" : errorNum ? "alarm" : errorWar ? "yellow" : ""}">
              ${displayMessage}
              ${
                !message && errorUseWarnings && errorWar
                  ? `${errorWar} ${errorWar === 1 ? "warning" : "warnings"}`
                  : ""
              }
            </h2>
            <img src="${codeBuddyFace}">
          </section>
        </body>
      </html>
    `;
  }
}

function getRandomErrorMessage(errorCount: number): string {
  const messages = [
    `Oh no! ${errorCount} little bugs! Time to grab a coffee and fix them.`,
    `${errorCount} errors? I bet they're just misunderstood features!`,
    `Yikes! ${errorCount} errors. Maybe it's time to call the debugger.`,
    `Uh-oh, ${errorCount} errors. Don't worry, even code geniuses make mistakes!`,
    `${errorCount} errors spotted! Time to show them who's boss.`,
    `Looks like ${errorCount} gremlins are messing with your code.`
  ];

  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
}

function getRandomSuccessMessage(): string {
  const messages = [
    "No errors detected. Great job!",
    "Flawless! Your code is looking sharp.",
    "Everything's working perfectly. Keep up the great work!",
    "Wow! Not a single bug in sight. You're on fire!",
    "Clean code, no errors. You're a true coding wizard!",
    "No issues found. Your skills are shining today!"
  ];

  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
}

function getNumErrors(): [number, number] {
  const activeTextEditor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
  if (!activeTextEditor) {
    return [0, 0];
  }
  const document: vscode.TextDocument = activeTextEditor.document;

  let numErrors = 0;
  let numWarnings = 0;

  let aggregatedDiagnostics: any = {};
  let diagnostic: vscode.Diagnostic;

  for (diagnostic of vscode.languages.getDiagnostics(document.uri)) {
    let key = "line" + diagnostic.range.start.line;

    if (aggregatedDiagnostics[key]) {
      aggregatedDiagnostics[key].arrayDiagnostics.push(diagnostic);
    } else {
      aggregatedDiagnostics[key] = {
        line: diagnostic.range.start.line,
        arrayDiagnostics: [diagnostic]
      };
    }

    switch (diagnostic.severity) {
      case 0:
        numErrors += 1;
        break;

      case 1:
        numWarnings += 1;
        break;
    }
  }

  return [numErrors, numWarnings];
}

export function deactivate() {}
