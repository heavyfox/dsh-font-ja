# DeepSeek Harness 日本語フォント

DeepSeek Harness の表示言語を「日本語」にすると、Web 画面や会話本文の既定フォントを **BIZ UDPゴシック** に切り替えます。DeepSeek Harness 本体の日本語表示を使うため、翻訳プラグインは不要です。

BIZ UDPゴシックが端末にない場合は、Noto Sans JP、ヒラギノ角ゴシック、メイリオ、游ゴシック、端末の標準フォントの順に、利用できるフォントが使われます。フォントファイルは同梱せず、外部からも取得しません。DeepSeek Harness の設定で指定した本文フォントは優先され、コードとターミナルのフォント設定には影響しません。

別の書体を使う場合は、DeepSeek Harness の「テキストフォント」欄に、端末にインストール済みのフォント名を指定してください。欄を空にすると、このプラグインの既定フォントに戻ります。

## 対応バージョン

- 対象：DeepSeek Harness **0.2.2-rc.1 以降**の Web プロファイル。後続の正式版もインストールできるよう、バージョンの上限は設けていません。
- 動作確認済み：Windows の **0.2.2-rc.1**。後続版は、本体の言語サービスやテーマの仕様変更によって調整が必要になる場合があります。

## インストール

DeepSeek Harness の起動に使う端末で、次を実行してください。

```powershell
dsh plugin --profile web add https://github.com/heavyfox/dsh-font-ja/releases/download/v0.1.0/dsh-font-ja-0.1.0.tgz
```

DeepSeek Harness を起動し、設定の表示言語で「日本語」を選ぶと適用されます。すでに起動中の場合は再起動してください。旧日本語化プラグイン `dsh-locale-ja-next` が有効な場合は、公式の日本語表示に切り替える際に無効にしてください。

## 元の表示に戻す

プラグイン管理画面で `dsh-font-ja` を無効にすると、元のフォントに戻ります。アンインストールする場合は次を実行してください。

```powershell
dsh plugin --profile web remove dsh-font-ja
```

## 開発

```powershell
npm ci
npm run build
npm pack
```

ブラウザで動作を確認する場合は、プラグインを入れたテスト用の Web プロファイルを起動し、`DSH_TEST_URL` にその起動 URL を設定して `npm run test:e2e` を実行します。初回のみ `npx playwright install chromium` が必要です。

ライセンスは [MIT](LICENSE) です。
