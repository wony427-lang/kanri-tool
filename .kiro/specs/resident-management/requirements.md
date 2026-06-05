# Requirements Document

## Project Description (Input)

老人ホームの利用者情報を管理する Web システム。現在、紙や PDF で運用されている利用者基本情報をデータベース化し、職員が安全に**登録・編集・検索・PDF 出力**できる状態を実現する。個人情報を扱うため、認証・権限管理・監査ログ等のセキュリティを重視する。

### フェーズ構成（本 spec のスコープ）

- **フェーズ 1: 利用者基本情報管理**（本 spec `resident-management` の対象）
- **フェーズ 2: 売上・請求・入金管理**（別 spec `billing-management` を想定。本書ではスコープ外）
- **フェーズ 3: 経営分析**（別 spec `business-analytics` を想定。本書ではスコープ外）

### フェーズ 1 の目的

利用者基本情報を安全にデータベース化し、職員が**検索・編集・PDF 出力**を日常運用できるようにする。あわせて、認証・権限管理・施設スコープ・期限アラート・利用者総合保険（年払い）・外部業者連携キー等、業務に直結する周辺機能を提供する。

### 推奨技術構成（参考）

- Next.js（App Router）／ TypeScript ／ Tailwind CSS
- PostgreSQL ／ Supabase ／ Prisma

（採用は design フェーズで確定。要件は WHAT を規定し、技術選定は HOW として扱う。）

---

## Introduction

`resident-management` は、老人ホーム運営の中核業務である**利用者基本情報管理**をデジタル化するフィーチャである。紙／PDF で分散している利用者情報・保険情報・医療連携情報を一元化し、職員が**所属施設のデータを正確かつ安全に参照・更新・出力**できる状態を提供する。

本フィーチャは以下を達成する：

1. **個人情報保護を前提とした認証・認可**（ID/PW、セッション、ロックアウト、3 役割の RBAC、監査ログ）
2. **複数施設対応**（マルチテナント方式は採らず、施設マスタ＋所属施設スコープで分離）
3. **利用者プロファイル一元管理**（基本情報・施設情報・利用状況・保険 4 種・医療／ケア／緊急連絡先・補足情報）
4. **保険期限アラート**（介護／医療／障害／負担割合証／公費／利用者総合保険を期限切れ／30・60・90 日前で可視化）
5. **利用者総合保険（年払い）の請求／入金管理**（次回請求日の自動計算、未請求一覧、更新履歴）
6. **PDF 出力**（施設内共有・医療機関連携・家族説明・紙保管用途）
7. **ダッシュボード**（利用者数・施設別人数・期限切れ・更新予定・未請求保険サマリ）

将来のフェーズ 2／3（売上・請求・経営分析）が**同じデータ基盤の上に拡張**できることを前提とした構造を意識する。

---

## Boundary Context

- **In scope（本 spec）**:
  - **業務ドメイン**
    - 認証・セッション・自動ログアウト・ロックアウト・手動ログアウト
    - 役割ベース認可（管理者／一般職員／閲覧専用）
    - 職員アカウント管理（CRUD・利用停止・最終ログイン日時）
    - パスワード管理ポリシー（ハッシュ保存・閲覧不可・リセット）
    - 利用者基本情報の CRUD（氏名・施設・利用状況・連絡先 等）
    - 保険情報（介護・医療・障害福祉・公費）の管理
    - 利用者総合保険（年払い）の請求／入金管理と次回請求日自動計算
    - 期限アラート（期限切れ／30／60／90 日前）
    - 医療機関・ケアマネ・緊急連絡先（2 件）の管理
    - 補足情報（病歴・備考・家族構成図／室内見取り図のファイル添付）
    - 外部業者連携キー管理
    - 利用者基本情報の PDF 出力
    - 利用者検索（氏名・要介護度・施設・主治医・ケアマネ・利用状況）
    - ダッシュボード（利用者数・施設別人数・期限切れ・更新予定・未請求）
    - 複数施設対応（施設マスタ＋施設スコープ）
    - 監査ログ
  - **UI 基盤（旧 `kanri-foundation` を本 spec に吸収）**
    - アプリケーションシェル（ヘッダー／サイドナビ／コンテンツ領域）
    - 設定駆動のナビゲーション基盤
    - 共通 `DataTable`（ヘッダー・ソート・ローディング・空状態・エラー・ページング）
    - 共通 `Form` レイアウト（フィールド・バリデーション・送信状態）
    - UI プリミティブ（Button / Input / Select / Modal / Toast）
    - デザイントークン（CSS 変数 + Tailwind v4 `@theme inline`、ライト／ダーク対応）
    - ページレイアウトテンプレート（List / Detail / Create / Edit）
    - App Router の `loading.tsx` / `error.tsx` を活用した境界コンポーネント
    - キーボード／スクリーンリーダ向けの基本アクセシビリティ
- **Out of scope（別 spec／後続フェーズ）**:
  - 月次売上・請求書発行・入金消し込み・未入金一覧（フェーズ 2 = 別 spec `billing-management` を想定）
  - 経営分析・前月対比／前年同月対比・CSV 出力（フェーズ 3 = 別 spec `business-analytics` を想定）
  - スマホ／タブレット用ネイティブアプリ
  - 国際化（i18n）／RTL。本 spec は日本語固定
  - 介護記録（バイタル・サービス提供記録等）。本 spec は「基本情報管理」に限定
- **Adjacent expectations**:
  - 利用者総合保険の「請求／入金」モデルは、フェーズ 2 の請求管理に拡張可能なスキーマ設計を意識する。
  - UI 基盤コンポーネントは将来のフェーズ 2／3 でも再利用されるため、業務ドメイン非依存の汎用 API を維持する。
  - 認証・認可・施設スコープは、フェーズ 2／3 の追加機能でも同一ポリシーを適用する。

---

## Requirements

### Requirement 1: 認証・セッション管理
**Objective:** As a 施設職員, I want ID／パスワードでログインし、未操作時に自動ログアウトされるセッション管理が提供されること, so that 個人情報を扱う画面が認証された自分の操作だけで利用される。

#### Acceptance Criteria
1. When 未認証ユーザーが認証必須ルートにアクセスしたとき, the Resident Management System shall ログイン画面へリダイレクトする。
2. When ユーザーが有効なログイン ID とパスワードを送信したとき, the Auth Service shall 認証セッションを発行し、ロール既定の初期画面へ遷移させる。
3. If ログイン ID またはパスワードが不一致のとき, then the Auth Service shall 「ID またはパスワードが正しくありません」という一般化したメッセージを返し、ID の存在有無を開示しない。
4. While 認証セッションが有効な間, the Auth Service shall 直近の操作からの経過時間を計測する。
5. When 直近の操作から規定時間（既定 30 分、設定変更可能）経過したとき, the Auth Service shall セッションを失効させ、次回操作時にログイン画面へリダイレクトする。
6. If 同一ログイン ID で規定回数（既定 5 回、設定変更可能）連続して認証に失敗したとき, then the Auth Service shall 当該アカウントを規定時間（既定 15 分）ロックし、その間の認証要求をすべて拒否する。
7. When ユーザーが手動ログアウトを要求したとき, the Auth Service shall 当該セッションを失効させ、ログイン画面へ遷移させる。
8. The Auth Service shall セッション識別子を HttpOnly／Secure／SameSite=Lax 等の方式で保管し、クライアントスクリプトから読み取り不能にする。

### Requirement 2: 権限管理・アクセス制御
**Objective:** As a 施設運営者, I want 役割（管理者／一般職員／閲覧専用）に基づくアクセス制御が施されていること, so that 各職員が業務上必要な操作のみを行え、過剰権限による事故を防げる。

#### Acceptance Criteria
1. The Authorization Service shall 「管理者」「一般職員」「閲覧専用」の 3 役割を提供し、各アカウントに 1 つ以上の役割を割り当てる。
2. When 「閲覧専用」のユーザーが利用者情報の作成・更新・削除または PDF 出力を要求したとき, the Authorization Service shall 当該操作を拒否し、権限エラーを返す。
3. When 「一般職員」のユーザーが職員アカウント管理または他人のパスワードリセットを要求したとき, the Authorization Service shall 当該操作を拒否し、権限エラーを返す。
4. When 「管理者」のユーザーが本システムの任意機能を要求したとき, the Authorization Service shall （施設スコープの範囲内で）当該操作を許可する。
5. The Authorization Service shall 認可チェックをサーバ側（Server Components／Route Handlers／Server Actions 等）で必ず実施し、クライアント UI 非表示のみに依存しない。
6. If アカウント利用状態が「停止」のとき, then the Authorization Service shall 役割に関わらず全要求を拒否する。

### Requirement 3: 職員アカウント管理
**Objective:** As a 管理者, I want 職員アカウントを登録・編集・利用停止できる管理機能が提供されること, so that 退職者・配置転換・役割変更を遅滞なく反映し、不要なアクセスを残さない。

#### Acceptance Criteria
1. The User Account Service shall 1 アカウントあたり 職員名・ログイン ID・メールアドレス・所属施設・役割（権限）・利用状態（有効／停止）・最終ログイン日時 を管理項目として保持する。
2. When 管理者が新規アカウントを登録したとき, the User Account Service shall ログイン ID とメールアドレスの一意性を検証し、重複時は登録を拒否する。
3. When 管理者が職員の所属施設・役割・利用状態を変更したとき, the User Account Service shall 変更を即時反映し、当該ユーザーの次回認可判定から適用する。
4. When 管理者が職員アカウントを「停止」にしたとき, the User Account Service shall 当該ユーザーの有効セッションをすべて失効させる。
5. The User Account Service shall ログイン成功時に当該アカウントの最終ログイン日時を更新する。
6. The User Account Service shall 「管理者」役割の有効アカウントが少なくとも 1 件残ることを保証し、最後の有効管理者の停止・削除・降格を禁止する。
7. If 管理者が自身のアカウントを停止しようとしたとき, then the User Account Service shall 操作を拒否し誤操作防止のメッセージを返す。

### Requirement 4: パスワード管理ポリシー
**Objective:** As a 個人情報を預かる事業者, I want パスワードが本人以外に閲覧されず、安全に保管・再設定できること, so that 法令・運用ガイドライン上の責務を果たし、漏洩・なりすましリスクを低減する。

#### Acceptance Criteria
1. The Password Service shall パスワードを保存する際に、ソルト付きの一方向ハッシュアルゴリズム（例: Argon2／bcrypt 等の標準的アルゴリズム）でハッシュ化して保管する。
2. The Password Service shall 平文パスワードを永続化せず、いかなる管理画面・ログ・API レスポンスにも出力しない。
3. When 管理者がパスワードリセットを要求したとき, the Password Service shall 仮パスワード発行 または 期限付き再設定 URL 送信のいずれかを実行し、管理者画面に新パスワードを表示しない。
4. When ユーザーが再設定 URL を介して新パスワードを設定したとき, the Password Service shall 再設定 URL を失効させ、当該アカウントの既存セッションをすべて失効させる。
5. The Password Service shall 新規／変更パスワードに対して最低限の強度ポリシー（最小文字数・文字種混在）を強制し、満たさない場合は変更を拒否する。
6. If 仮パスワードまたは再設定 URL が規定時間（既定 24 時間）を超過したとき, then the Password Service shall 当該認証情報を失効させ、再発行を要求する。

### Requirement 5: 利用者基本情報管理
**Objective:** As a 施設職員, I want 利用者の基本情報・施設情報・利用状況を登録・編集できること, so that 紙／PDF で分散している情報を一元的に正確に管理できる。

#### Acceptance Criteria
1. The Resident Profile Service shall 1 利用者あたり、基本情報（利用者氏名・フリガナ・生年月日・年齢・性別・住所・電話番号・携帯番号）と施設情報（所属施設・入居日・退去日・利用状況）を構造化データとして保持する。
2. The Resident Profile Service shall 生年月日から年齢を自動算出し、画面表示時に常に最新の年齢を返す（保存値ではなく派生値として扱う）。
3. The Resident Profile Service shall 利用状況の有効値を「入居中」「退去済み」「入居予定」「一時停止」の 4 種類に限定する。
4. When 利用状況を「退去済み」に変更したとき, the Resident Profile Service shall 退去日の入力を必須とし、未入力の場合は更新を拒否する。
5. When 利用状況を「入居中」または「入居予定」に変更したとき, the Resident Profile Service shall 退去日を未入力（または無効化）として扱う。
6. The Resident Profile Service shall 必須項目（利用者氏名・フリガナ・生年月日・性別・所属施設・利用状況）の未入力を伴う登録・更新を拒否する。
7. If フリガナにカタカナ以外の文字が含まれているとき, then the Resident Profile Service shall バリデーションエラーを返し、登録・更新を拒否する。
8. When 一般職員または管理者が利用者情報を更新したとき, the Resident Profile Service shall 更新者・更新日時を監査用に記録する。
9. If 一般職員が所属施設の異なる利用者の更新を要求したとき, then the Resident Profile Service shall 施設スコープに基づき当該操作を拒否する。

### Requirement 6: 利用者検索・一覧
**Objective:** As a 施設職員, I want 氏名・要介護度・所属施設・主治医・ケアマネ・利用状況による検索ができ、一覧で必要項目を一望できること, so that 目的の利用者情報に最短ステップで到達できる。

#### Acceptance Criteria
1. The Resident Search Service shall 利用者一覧画面で 利用者名・生年月日・年齢・要介護度・所属施設・主治医・担当ケアマネ・利用状況 を表示列として提供する。
2. The Resident Search Service shall 氏名（部分一致、フリガナも含む）・要介護度（完全一致）・所属施設（完全一致）・主治医（部分一致）・担当ケアマネ（部分一致）・利用状況（完全一致）の各条件による絞り込みを提供する。
3. When 複数の検索条件が指定されたとき, the Resident Search Service shall すべての条件を AND 結合して絞り込みを行う。
4. The Resident Search Service shall 結果件数が規定（既定 50 件）を超える場合にページングを提供する。
5. While 検索結果取得が進行中の間, the Resident Search Service shall ヘッダーを保持したまま結果領域を骨格表示（スケルトン）で埋める。
6. If 検索結果が 0 件のとき, then the Resident Search Service shall 「該当する利用者はいません」と検索条件見直しの導線を表示する。
7. The Resident Search Service shall 既定では閲覧者の所属施設に属する利用者のみを返し、施設フィルタを明示的に切り替えた場合のみ他施設の利用者を含める。
8. If 「閲覧専用」ユーザーが検索結果から PDF 出力ボタンを操作したとき, then the Resident Search Service shall PDF 出力ボタンを非活性表示にし、要求された場合も拒否する。

### Requirement 7: 保険情報管理（介護・医療・障害福祉・公費）
**Objective:** As a 施設職員, I want 利用者ごとに介護保険・医療保険・障害福祉・公費の保険情報を管理できること, so that 必要書類の確認やケア計画策定で随時参照でき、誤入力・転記漏れを防げる。

#### Acceptance Criteria
1. The Insurance Information Service shall 利用者 1 件に対して 介護保険・医療保険・障害福祉・公費 の 4 カテゴリを独立に保持する。
2. The Insurance Information Service shall 介護保険に対して 保険者番号・被保険者番号・要介護度・認定日・認定有効期間（開始日・終了日）・負担割合証・負担割合証有効期限 を保持する。
3. The Insurance Information Service shall 医療保険に対して 保険者番号・被保険者番号・有効期限 を保持する。
4. The Insurance Information Service shall 障害福祉情報に対して 受給者証番号・障害支援区分・サービス種別・支給決定期間（開始日・終了日）・支給量 を保持する。
5. The Insurance Information Service shall 公費情報を 利用者 1 件あたり複数件 保持でき、各件について 公費種別・有効期限・負担者番号・受給者番号・本人負担額 を保持する。
6. When 各保険の有効期限・有効期間が更新されたとき, the Insurance Information Service shall 期限アラート機能の判定対象データを最新化する。
7. If 各保険の数値項目（保険者番号・被保険者番号・負担者番号・受給者番号 等）が規定の桁数・形式に違反するとき, then the Insurance Information Service shall バリデーションエラーを返し更新を拒否する。
8. If 認定有効期間または支給決定期間の終了日が開始日より前のとき, then the Insurance Information Service shall バリデーションエラーを返し更新を拒否する。

### Requirement 8: 利用者総合保険（年払い）管理
**Objective:** As a 施設運営担当, I want 利用者総合保険（施設利用時の損害保険）の年払い情報を、次回請求日の自動計算とともに管理できること, so that 請求漏れ・更新漏れを防ぎ、未請求／未入金状況を正確に把握できる。

#### Acceptance Criteria
1. The Comprehensive Insurance Service shall 利用者ごとに 加入有無・保険会社・証券番号・加入日・保険開始日・保険終了日・年間保険料・次回請求予定日・請求状況・入金状況・備考 を保持する。
2. When 加入有無が「加入」かつ 保険開始日（または前回請求日）が確定したとき, the Comprehensive Insurance Service shall 次回請求予定日を「直近基準日 ＋ 1 年」で自動計算して反映する。
3. The Comprehensive Insurance Service shall 「次回請求予定日が本日以前」かつ「請求状況が未請求」の利用者を含む 未請求一覧 を提供する。
4. When 担当者が請求状況を「請求済み」または入金状況を「入金済み」に更新したとき, the Comprehensive Insurance Service shall 変更前・変更後・変更日時・変更者を更新履歴として記録する。
5. When 請求状況が「請求済み」かつ入金状況が「入金済み」に確定したとき, the Comprehensive Insurance Service shall 当該年度サイクルを完了状態とし、次回請求予定日を翌年に進める。
6. If 加入有無が「未加入」のとき, then the Comprehensive Insurance Service shall 次回請求予定日・請求状況・入金状況の更新および未請求一覧への計上を行わない。
7. The Comprehensive Insurance Service shall 1 利用者に対する加入・解約・年度ごとの請求／入金履歴を時系列で参照できるようにする。
8. If 「閲覧専用」ユーザーが請求／入金状況の変更を要求したとき, then the Comprehensive Insurance Service shall 当該操作を拒否する。

### Requirement 9: 保険期限アラート機能
**Objective:** As a 施設職員, I want 各種保険（介護・医療・障害・負担割合証・公費・利用者総合保険）の期限切れと近接更新を可視化できること, so that 失効による請求不可・サービス停止を未然に防げる。

#### Acceptance Criteria
1. The Expiration Alert Service shall 介護保険・医療保険・障害保険・負担割合証・公費・利用者総合保険 を期限監視の対象とする。
2. The Expiration Alert Service shall 各保険について「期限切れ」「30 日以内」「60 日以内」「90 日以内」の 4 区分でアラートを分類する。
3. The Expiration Alert Service shall アラート一覧の各行に 利用者名・所属施設・保険種別・有効期限・残り日数・対応状況 を表示する。
4. When 職員が対応状況（例: 未対応／確認済み／更新済み／連絡済み）を更新したとき, the Expiration Alert Service shall 状態変更を保存し、ダッシュボード集計件数に反映する。
5. The Expiration Alert Service shall アラート計算を画面表示時点の日付基準で行い、画面リロード時に常に最新の残り日数を返す。
6. If 保険情報が削除または「該当なし」に変更されたとき, then the Expiration Alert Service shall 当該保険のアラートを次回判定から除外する。
7. The Expiration Alert Service shall 既定では閲覧者の所属施設のアラートのみを返し、管理者が施設フィルタで明示選択した場合のみ他施設のアラートを含める。
8. The Expiration Alert Service shall アラート一覧から該当利用者の詳細画面・該当保険の編集画面へ 1 クリックで遷移できる導線を提供する。

### Requirement 10: 医療機関・ケアマネ・緊急連絡先管理
**Objective:** As a 施設職員, I want 利用者に紐づく医療機関情報・ケアマネ情報・緊急連絡先を漏れなく管理できること, so that 急変時や外部連携時に必要な連絡先・受け入れ先を即座に参照できる。

#### Acceptance Criteria
1. The Medical Care Information Service shall 1 利用者あたり 医療機関名・主治医・緊急搬送希望病院 を保持する。
2. The Medical Care Information Service shall 1 利用者あたり ケアマネ情報（居宅介護支援事業所・指定番号・介護支援専門員）を保持する。
3. The Medical Care Information Service shall 1 利用者あたり 緊急連絡先を 2 件まで（氏名・続柄・住所・電話番号・携帯番号）保持できる。
4. If 緊急連絡先 1 の電話番号と携帯番号がいずれも未入力のとき, then the Medical Care Information Service shall 「緊急時連絡手段が無い」旨の警告を表示する（登録自体は許容する）。
5. The Medical Care Information Service shall 主治医・ケアマネ・所属施設を利用者検索のキーとして公開する。
6. If 緊急連絡先 2 が入力された状態で緊急連絡先 1 を未入力に戻そうとしたとき, then the Medical Care Information Service shall 「緊急連絡先 1 を空にできません」とエラーを返し、入力順序の整合性を強制する。

### Requirement 11: 補足情報・添付資料管理
**Objective:** As a 施設職員, I want 病歴・備考・家族構成図・室内見取り図を利用者プロファイルから直接参照できること, so that 紙ベースで散在していた補足情報をデジタルで一元化できる。

#### Acceptance Criteria
1. The Resident Document Service shall 1 利用者あたり 病歴・備考 を自由記述テキストとして保持する。
2. The Resident Document Service shall 1 利用者あたり 家族構成図・室内見取り図 を画像（PNG／JPEG）または PDF ファイルとしてアップロード・差し替え・削除できる。
3. When ファイルがアップロードされたとき, the Resident Document Service shall ファイル種別・サイズ上限（既定: 1 ファイル 10 MB）を検証し、上限超過時はアップロードを拒否する。
4. The Resident Document Service shall アップロードされたファイルを、認証・認可済みリクエスト経由でのみ取得可能なストレージに保存し、直接公開 URL を持たせない。
5. When 利用者が削除されたとき, the Resident Document Service shall 当該利用者に紐づく添付ファイルもストレージ上から削除する。
6. If 「閲覧専用」ユーザーがファイルのアップロード・差し替え・削除を要求したとき, then the Resident Document Service shall 当該操作を拒否する。

### Requirement 12: 外部業者連携キー管理
**Objective:** As a 施設運営担当, I want 利用者に紐づく外部システムのユニークキーを業者種別ごとに管理できること, so that 介護請求ソフト・医療機関・給食業者などとのデータ連携時に対応関係を正確に保てる。

#### Acceptance Criteria
1. The External Vendor Service shall 1 利用者あたり複数の業者連携キー（業者名・業者種別・ユニークキー・備考）を保持できる。
2. The External Vendor Service shall 業者種別として 介護請求ソフト・医療機関・保険会社・給食業者・訪問看護・その他 を選択肢として提供する。
3. When 同一利用者・同一業者種別・同一業者名で重複するユニークキーが登録されようとしたとき, the External Vendor Service shall 重複を検出して登録を拒否する。
4. The External Vendor Service shall ユニークキーの値を一覧画面で既定マスクし、明示的に表示操作を行った場合のみ全文を表示する。
5. The External Vendor Service shall ユニークキーをログ・PDF・全文検索インデックスに露出させない。

### Requirement 13: 利用者基本情報 PDF 出力
**Objective:** As a 施設職員, I want 利用者基本情報を整形された PDF として出力できること, so that 施設内共有・医療機関連携・家族説明・紙保管といった既存業務にそのまま使える。

#### Acceptance Criteria
1. The PDF Export Service shall 利用者 1 件を対象に、基本情報・施設情報・利用状況・保険情報（介護・医療・障害・公費）・医療機関情報・ケアマネ情報・緊急連絡先・病歴・備考 をひとつの PDF 文書として出力する。
2. The PDF Export Service shall 出力 PDF のヘッダーに 利用者名・所属施設・出力日時・出力者 を記載する。
3. When 一般職員または管理者が PDF 出力を要求したとき, the PDF Export Service shall 出力対象利用者・出力者・出力日時を監査ログに記録する。
4. If 「閲覧専用」ユーザーが PDF 出力を要求したとき, then the PDF Export Service shall 要求を拒否し権限エラーを返す。
5. The PDF Export Service shall 日本語（漢字・ひらがな・カタカナ）が文字化けなく出力できるフォントを埋め込む。
6. If 出力対象利用者が閲覧者の施設スコープ外にある（かつ管理者でない）とき, then the PDF Export Service shall 出力を拒否する。

### Requirement 14: ダッシュボード
**Objective:** As a 施設責任者・職員, I want 利用者数・施設別人数・保険期限切れ・更新予定・未請求保険を 1 画面で把握できること, so that 当日対応すべき事項に即座に着手できる。

#### Acceptance Criteria
1. The Dashboard Service shall ログイン直後の初期画面として、利用者数・施設別人数・保険期限切れ件数・更新予定件数（30 日以内）・未請求保険件数 を表示する。
2. The Dashboard Service shall 各サマリ件数から、該当の詳細一覧（期限アラート画面・未請求一覧画面・利用者一覧画面）へ遷移できるリンクを提供する。
3. The Dashboard Service shall 閲覧者の所属施設のサマリを既定で表示し、管理者は施設フィルタで全施設または特定施設のサマリを参照できる。
4. While ダッシュボードの集計が進行中の間, the Dashboard Service shall 各サマリカードを骨格表示（スケルトン）で埋める。
5. The Dashboard Service shall 集計値を画面表示時点で算出し、リロード時に常に最新値を返す。

### Requirement 15: 複数施設対応・データスコープ
**Objective:** As a 施設運営者, I want 複数施設を 1 つのデータ基盤の中で扱い、職員には所属施設のデータのみが既定で見えること, so that 施設追加が容易でありながら、施設横断の情報漏洩リスクを抑えられる。

#### Acceptance Criteria
1. The Facility Scope Service shall 「施設」マスタを保持し、職員アカウントと利用者の双方に 1 つ以上の所属施設を紐付ける（マルチテナント方式は採用しない）。
2. When 一般職員または閲覧専用ユーザーが利用者・保険・アラート・PDF のいずれかにアクセスしたとき, the Facility Scope Service shall 既定で当該ユーザーの所属施設に紐づくデータのみを返す。
3. When 管理者が施設フィルタで他施設または全施設を明示的に選択したとき, the Facility Scope Service shall 当該施設のデータも結果に含める。
4. The Facility Scope Service shall 新規施設の追加に対して、施設マスタへのレコード追加とユーザー／利用者の所属付け替えのみで対応でき、機能コードの改修を不要とする。
5. If 職員アカウントの所属施設が未設定のとき, then the Facility Scope Service shall 当該ユーザーの利用者・保険関連データへのアクセスをすべて拒否する。
6. The Facility Scope Service shall 施設マスタの管理（追加・名称変更・閉鎖）を管理者ロールのみに許可する。

### Requirement 16: 個人情報保護・監査ログ
**Objective:** As a 個人情報取扱事業者, I want 重要操作の監査ログが残り、不要な個人情報露出を抑止する仕組みがあること, so that 監査要求・インシデント調査・運用改善に必要な証跡を確保できる。

#### Acceptance Criteria
1. The Audit Log Service shall 認証イベント（成功・失敗・ロック・ログアウト）、利用者情報の作成・更新・削除、PDF 出力、職員アカウント変更、パスワードリセット、施設マスタ変更 を監査対象イベントとして記録する。
2. The Audit Log Service shall 各監査ログに 操作者・操作日時・操作種別・対象識別子（利用者 ID／アカウント ID／施設 ID 等）・操作元 IP アドレス を保持する。
3. The Audit Log Service shall 監査ログに 平文パスワード・保険のフル番号・外部業者連携ユニークキー など秘匿情報そのものを保存しない。
4. While 任意のサーバ処理がエラーフォールバックを返す間, the Resident Management System shall エラーメッセージ・スタックトレースを利用者識別可能な個人情報と共にユーザー画面へ露出させない。
5. The Audit Log Service shall 監査ログを「管理者」役割のみが閲覧可能とし、「一般職員」「閲覧専用」からは参照できないようにする。
6. The Resident Management System shall HTTPS（TLS）通信を必須とし、HTTP でのアクセスは自動的に HTTPS へリダイレクトする。
7. The Resident Management System shall 個人情報を含むレスポンスに対して `Cache-Control: no-store` 等、ブラウザ／中間キャッシュへの保持を抑止するヘッダを付与する。

---

## UI Foundation Requirements

> 本セクションは旧 spec `kanri-foundation` から本 spec へ統合した UI 共通基盤要件である。
> 業務ドメイン要件（Req 1-16）が依存する横串の UI／UX 基盤を規定する。

### Requirement 17: アプリケーションシェル
**Objective:** As a 職員（全役割）, I want すべての画面で一貫したヘッダー・サイドナビゲーション・コンテンツ領域が表示されること, so that 画面遷移しても操作場所と現在地を見失わずに作業できる。

#### Acceptance Criteria
1. When 認証済みユーザーが任意の認証必須ルートにアクセスしたとき, the UI Shell shall ヘッダー・サイドナビゲーション・メインコンテンツの 3 領域を含むレイアウトをレンダリングする。
2. While ユーザーが同一アプリ内のサブルート間を遷移している間, the UI Shell shall ヘッダーとサイドナビゲーションを再マウントせずに保持する。
3. The UI Shell shall ヘッダーに 現在のユーザー表示名・所属施設・ログアウト導線・（管理者の場合）施設フィルタ を配置する。
4. The UI Shell shall ビューポート幅が変わってもヘッダーとサイドナビゲーションが崩れないレスポンシブレイアウトを提供する。
5. When ビューポート幅が規定のモバイルブレークポイント未満になったとき, the UI Shell shall サイドナビゲーションを折りたたみ可能なオフキャンバス UI に切り替える。
6. The UI Shell shall ログイン画面・パスワード再設定画面など未認証ルートではヘッダー／サイドナビを表示しない。

### Requirement 18: ナビゲーション基盤
**Objective:** As a 職員, I want 現在地と他機能への導線が一目で分かるナビゲーションが表示されること, so that 必要な画面に最短手数で遷移できる。

#### Acceptance Criteria
1. The Navigation shall 構造化された設定（ラベル・パス・任意のアイコン・必要権限・並び順）からナビゲーション項目をレンダリングする。
2. When ユーザーが現在ルートに一致するナビゲーション項目を見たとき, the Navigation shall 当該項目を「現在地」として視覚的に強調し、`aria-current="page"` を付与する。
3. When 新しい画面（例: 期限アラート一覧、未請求一覧）が追加されたとき, the Navigation shall ナビゲーションコンポーネント本体のコード変更を伴わず、設定追加のみで項目を反映する。
4. If ナビゲーション項目に「必要権限」が指定されているとき, then the Navigation shall 当該ユーザーが権限を満たさない項目を非表示にする。
5. If ナビゲーション設定にアイコンが指定されていないとき, then the Navigation shall ラベルのみで崩れずレンダリングする。
6. Where ナビゲーションがオフキャンバスモードで表示されているとき, the Navigation shall 項目選択後にオフキャンバスを自動的に閉じる。

### Requirement 19: 共通テーブル基盤（DataTable）
**Objective:** As a 職員, I want 利用者一覧・期限アラート一覧・未請求一覧などで同じ表示・操作感が提供されること, so that 新しい画面でも学習コストなく内容を読み取り操作できる。

#### Acceptance Criteria
1. The DataTable shall 列定義（キー・表示名・描画関数・ソート可否）と行データを受け取り、ヘッダー付きの表形式でレンダリングする。
2. When 「ソート可能」と指定された列ヘッダーをユーザーがクリックしたとき, the DataTable shall 昇順 → 降順 → 解除のサイクルでソート状態を切り替える。
3. While 行データの取得が進行中の間, the DataTable shall ヘッダーを保持したまま行領域に骨格（スケルトン）行を表示する。
4. If 行データが 0 件のとき, then the DataTable shall 「データがありません」とユーザーが取りうる次の操作（例: 検索条件のクリア、新規作成）を含む空状態を表示する。
5. Where ページング機能が有効化されているとき, the DataTable shall 1 ページあたりの件数・現在のページ番号・前後ページ移動コントロールを表示する。
6. If 行データ取得に失敗したとき, then the DataTable shall ヘッダーを保持したままエラーメッセージと「再試行」アクションを表示する。
7. The DataTable shall 各行を「詳細画面への遷移」可能な要素として扱える行クリックハンドラ／キーボード（Enter）操作対応を提供する。

### Requirement 20: 共通フォーム基盤（Form）
**Objective:** As a 職員, I want 利用者登録・保険更新・職員アカウント編集など、入力体験が画面間で統一されていること, so that 入力ミス・送信状態・エラーを予測しやすく安心して操作できる。

#### Acceptance Criteria
1. The Form shall ラベル・入力欄・補助テキスト・エラーメッセージを縦並びに配置する一貫したフィールドレイアウトを提供する。
2. When 入力値に対する検証エラーが発生したとき, the Form shall 対象フィールドの直下にエラーメッセージを表示し、フィールドに `aria-invalid="true"` と視覚的なエラースタイルを適用する。
3. While フォーム送信が進行中の間, the Form shall 送信ボタンを「送信中」表示に切り替え、再クリックによる二重送信を抑止する。
4. If フォーム送信が失敗したとき, then the Form shall 失敗理由をフォーム上部または送信ボタン近傍に表示し、ユーザーが入力した値を保持する。
5. When フォーム送信が成功したとき, the Form shall 成功通知（Toast）を表示する。
6. When ユーザーが「キャンセル」を選択したとき, the Form shall 未保存の変更がある場合に破棄確認を求める。
7. The Form shall サーバ側バリデーションのエラーレスポンスをフィールド単位／フォーム全体のいずれにも割り当てて表示できる API を提供する。

### Requirement 21: UI プリミティブ
**Objective:** As a 実装者, I want 標準化された UI 部品（Button・Input・Select・Modal・Toast）が用意されていること, so that 各画面で見た目・振る舞いを再発明せず短時間で画面を組み上げられる。

#### Acceptance Criteria
1. The UI Kit shall Button / Input / Select / Modal / Toast の各プリミティブをエクスポートする。
2. The UI Kit shall 各プリミティブを Tailwind v4 のテーマ変数経由でスタイリングし、テーマ値の変更に自動追従させる。
3. When プリミティブが `disabled` 状態を受け取ったとき, the UI Kit shall ポインター操作を不可にし、`aria-disabled="true"` を付与し、視覚的にも無効状態として描画する。
4. The UI Kit shall キーボード操作（Tab／Shift+Tab／Enter／Esc）のみでフォーカス移動・決定・閉じる動作が完結するアクセシビリティ属性とハンドリングを提供する。
5. When `Toast` が表示されたとき, the UI Kit shall 既定経過時間で自動的に閉じ、`role="status"` または `role="alert"` を内容種別に応じて付与する。
6. The UI Kit shall 「Destructive 操作」（削除・利用停止 等）を区別するスタイルバリアントと、確認ダイアログを伴う使い方の規約を提供する。

### Requirement 22: デザイントークン／テーマ
**Objective:** As a 職員, I want OS の配色設定（ライト／ダーク）に追従する視認性の高い画面が表示されること, so that 利用環境に合わせて快適に長時間操作できる。

#### Acceptance Criteria
1. The Theme shall 色・余白・タイポグラフィのトークンを CSS 変数として `globals.css` に一元定義する。
2. When OS の `prefers-color-scheme` が `dark` のとき, the Theme shall ダーク用の CSS 変数値に切り替える。
3. The Theme shall Tailwind v4 の `@theme inline` を通して、CSS 変数を Tailwind ユーティリティクラスから参照可能にする。
4. The Theme shall コンポーネント内で色リテラル（例: `#fff`、`rgb(...)`）を直接指定することを禁止し、`globals.css` のトークン経由のみを許容する規約を明文化する。
5. The Theme shall 既定の前景／背景色のコントラスト比が WCAG AA（通常テキスト 4.5:1、大きいテキスト 3:1）以上となるトークン値を持つ。

### Requirement 23: ページレイアウトテンプレート
**Objective:** As a 実装者, I want 一覧・詳細・新規作成・編集の各ページに共通するスケルトンが提供されていること, so that 新画面を最小コードで追加でき、画面構造の一貫性も保てる。

#### Acceptance Criteria
1. The Page Layout shall List / Detail / Create / Edit の 4 種類のページレイアウトテンプレートを提供する。
2. When 実装者が List レイアウトを使用したとき, the Page Layout shall タイトル・主要アクション領域（例: 新規作成）・フィルタ領域・`DataTable` スロットを含む構成を提供する。
3. When 実装者が Detail レイアウトを使用したとき, the Page Layout shall タイトル・サブタイトル・主要アクション領域（例: 編集／PDF 出力）・本文（属性表示）スロットを含む構成を提供する。
4. When 実装者が Create または Edit レイアウトを使用したとき, the Page Layout shall タイトル・`Form` スロット・送信／キャンセルアクション領域を含む構成を提供する。
5. The Page Layout shall すべてのテンプレートを Server Components ファーストで合成可能とし、`"use client"` はインタラクション要素のみに限定する。
6. The Page Layout shall App Router の `layout.tsx` または `page.tsx` から呼び出して合成できる Props ベースの API を提供する。

### Requirement 24: ローディング／エラー境界
**Objective:** As a 職員, I want 通信遅延や予期せぬエラー時に「壊れた画面」ではなく明確なフィードバックが表示されること, so that 何が起きているかを把握して次の操作を判断できる。

#### Acceptance Criteria
1. The Boundary shall App Router の `loading.tsx` と `error.tsx` を活用した既定の境界コンポーネント（スケルトンとエラーフォールバック）を提供する。
2. While ルート遷移やデータ取得が進行中の間, the Boundary shall コンテンツ領域に骨格表示（スケルトン）を表示する。
3. If ページレンダリング中に例外が発生したとき, then the Boundary shall ユーザー向けのエラーメッセージと「再試行」アクションを含むフォールバックを表示する。
4. When ユーザーが「再試行」を実行したとき, the Boundary shall `error.tsx` の `reset()` を呼び出して該当境界配下を再レンダリングする。
5. The Boundary shall 例外の生スタックトレース・利用者識別可能な個人情報をユーザー向けフォールバック画面に露出しない。
6. If 認可エラー（403）が境界に伝播したとき, then the Boundary shall 「権限がありません」と一覧画面への戻り導線を表示する。

### Requirement 25: アクセシビリティ／入力支援
**Objective:** As a すべての職員（キーボード操作および支援技術の利用者を含む）, I want 主要操作がアクセシブルに行えること, so that 環境や身体特性に依存せず安全に業務を遂行できる。

#### Acceptance Criteria
1. The Accessibility shall すべてのインタラクティブ要素にキーボードフォーカス可能性と可視フォーカスリング（フォーカスインジケータ）を提供する。
2. The Accessibility shall ボタン・入力欄・ナビゲーション項目に意味のあるアクセシブルネーム（`aria-label` または可視ラベル）を付与する。
3. When モーダルが開いたとき, the Accessibility shall フォーカスをモーダル内にトラップし、`Esc` キーで閉じる動作を提供する。
4. The Accessibility shall 主要色トークンが WCAG AA の色コントラスト要件（通常テキスト 4.5:1 以上）を満たすことを保証する。
5. The Accessibility shall ページごとに 1 つの `<h1>` を持ち、見出し階層（h1→h2→h3）が論理的に整列することを規約として求める。
6. When ユーザーが `prefers-reduced-motion: reduce` を設定しているとき, the Accessibility shall 過度なアニメーション（モーダルの拡大演出・スライド遷移 等）を抑制または無効化する。
