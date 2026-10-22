import { useTranslation } from "react-i18next";
export function CustomIntegrationsSection() {
  const { t } = useTranslation();
  return (
    <>
      <h3 className="mt-12">{t("resources.customIntegrations")}</h3>
      <div className="bg-primary/10 border border-primary/40 rounded-lg p-6 mt-4">
        <h4 className="font-semibold text-primary mb-2">
          {t("resources.needACustomIntegration")}
        </h4>
        <p className="text-primary mb-4">
          {t("resources.useOurRestApiAndWebhooksToBuildYourOwnConnectionsOurApiDocumentationProvidesDetailedExamplesAndCodeSamples")}
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h5 className="font-medium text-primary mb-2">
              {t("resources.restApiFeatures")}
            </h5>
            <ul className="text-sm text-primary space-y-1">
              <li>{t("resources.fullCrudOperations")}</li>
              <li>{t("resources.realTimeDataAccess")}</li>
              <li>{t("resources.comprehensiveDocumentation")}</li>
              <li>{t("resources.rateLimitingProtection")}</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-primary mb-2">
              {t("resources.webhookCapabilities")}
            </h5>
            <ul className="text-sm text-primary space-y-1">
              <li>{t("resources.eventDrivenNotifications")}</li>
              <li>{t("resources.secureSignatureVerification")}</li>
              <li>{t("resources.automaticRetryLogic")}</li>
              <li>{t("resources.flexiblePayloadFormats")}</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
