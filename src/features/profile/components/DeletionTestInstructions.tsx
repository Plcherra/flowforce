import { useTranslation } from "react-i18next";
export default function DeletionTestInstructions() {
  const { t } = useTranslation();
  return (
    <div className="text-xs text-muted-foreground space-y-1">
      <p>
        <strong>{t("profile.note")}</strong> {t("profile.toTestThisProperly")}
      </p>
      <p>{t("profile.n1CreateATestAccountAndNoteTheCredentials")}</p>
      <p>{t("profile.n2DeleteThatAccountUsingTheDeleteAccountButton")}</p>
      <p>{t("profile.n3RunTheseTestsWithThoseCredentials")}</p>
      <p>{t("profile.n4AllTestsShouldPassIndicatingProperDeletion")}</p>
    </div>
  );
}
