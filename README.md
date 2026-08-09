# 遺物庫（RelicVault）- スタンドアロンWeb版

Claudeアーティファクトに依存せず、単独のWebアプリとして動く版です。

## データの扱い

- 遺物データ・お気に入り・タグ・ビルドは、すべて**あなたのブラウザの中（IndexedDB）**に保存されます
- サーバーには何も送信されません
- 起動直後は遺物データが0件の「空の箱」状態です。JSONインポートで使い始めてください
- 友人が同じURLを開いても、データは友人のブラウザ内に別々に保存されます（混ざりません）
- 別の端末・別のブラウザに移るときは、今まで通りJSONのエクスポート／インポートで持ち運んでください（自動同期はしません）

---

## 手順1：GitHubアカウントを作る（すでにお持ちならスキップ）

1. https://github.com/ を開く
2. 右上の「Sign up」を押す
3. メールアドレス・パスワード・ユーザー名を入力して登録（無料）

## 手順2：GitHubにこのコードを置く

1. GitHubにログインした状態で右上の「+」→「New repository」
2. リポジトリ名を決めて（例：`relicvault-web`）作成（Publicで問題ありません）
3. このフォルダ一式（package.json・vite.config.js・index.html・src/ など）を、作成したリポジトリにアップロードします
   - GitHubのWeb画面から「Add file」→「Upload files」でドラッグ＆ドロップするのが一番簡単です
   - 慣れていればGitコマンドでpushしても構いません

## 手順3：Vercelアカウントを作る（すでにお持ちならスキップ）

1. https://vercel.com/ を開く
2. 「Sign Up」→「Continue with GitHub」を選ぶ（GitHubアカウントでそのままログインできます、無料）

## 手順4：VercelでこのリポジトリをWebアプリとして公開する

1. Vercelのダッシュボードで「Add New...」→「Project」
2. 先ほどGitHubに置いたリポジトリ（例：`relicvault-web`）を選んで「Import」
3. フレームワークは自動的に「Vite」と認識されるはずです（されなければ手動で選択）
4. そのまま「Deploy」を押す
5. 数十秒〜数分待つと、`https://relicvault-web-XXXX.vercel.app` のようなURLが発行されます

これで完成です。以後は、コードを直したいときにGitHub上のファイルを更新すれば、Vercelが自動的に再ビルド・再公開してくれます。

## 手動で自分のPCで動かしたい場合（任意）

```
npm install
npm run dev
```

でローカル確認用サーバーが立ち上がります。

```
npm run build
```

で本番用ファイル一式が `dist/` に出力されます（これをどこにでも静的ホスティングできます）。
