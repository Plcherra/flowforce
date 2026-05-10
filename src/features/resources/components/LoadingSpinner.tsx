import { useTranslation } from "react-i18next";

export default function LoadingSpinner() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3F51B5] mx-auto mb-4"></div>
        <p className="text-gray-600">{t("resources.loadingMessage")}</p>
      </div>
    </div>
  );
}
