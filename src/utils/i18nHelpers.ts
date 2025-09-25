import i18n from '@/i18n/config';

/**
 * Dynamic Content Internationalization Helper
 * Addresses Challenge 1: Dynamic content from database
 */
export class I18nHelpers {
  
  /**
   * Get localized template name and description
   * Handles dynamic template content from businessTemplates.ts
   */
  static getLocalizedTemplate(templateId: string) {
    const baseKey = `templates.${templateId}`;
    return {
      name: i18n.exists(`${baseKey}.name`) 
        ? i18n.t(`${baseKey}.name`) 
        : i18n.t(`templates.fallback.name`, { id: templateId }),
      description: i18n.exists(`${baseKey}.description`) 
        ? i18n.t(`${baseKey}.description`) 
        : i18n.t(`templates.fallback.description`, { id: templateId })
    };
  }

  /**
   * Get localized section names
   * Handles dynamic section content from availableSections.ts
   */
  static getLocalizedSection(sectionId: string) {
    const baseKey = `sections.${sectionId}`;
    return {
      name: i18n.exists(`${baseKey}.name`) 
        ? i18n.t(`${baseKey}.name`) 
        : sectionId.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: i18n.exists(`${baseKey}.description`) 
        ? i18n.t(`${baseKey}.description`) 
        : i18n.t('sections.fallback.description', { section: sectionId })
    };
  }

  /**
   * Pluralization Helper
   * Addresses Challenge 2: Handling singular/plural forms
   */
  static pluralize(key: string, count: number, options?: any): string {
    // Use i18next's built-in pluralization
    return i18n.t(key, { count, ...options }) as string;
  }

  /**
   * Context-aware translations
   * Addresses Challenge 3: Context-aware translations
   */
  static getContextualTranslation(baseKey: string, context: string, fallback?: string): string {
    const contextKey = `${baseKey}_${context}`;
    return i18n.exists(contextKey) 
      ? i18n.t(contextKey) as string
      : (fallback || i18n.t(baseKey) as string);
  }

  /**
   * Validation error messages with interpolation
   * Addresses Challenge 4: Proper error localization
   */
  static getValidationError(field: string, type: string, options?: any): string {
    const key = `validation.${type}`;
    return i18n.t(key, { field: i18n.t(`fields.${field}`), ...options }) as string;
  }

  /**
   * Date formatting with locale
   * Addresses Challenge 5: Regional date formatting
   */
  static formatDate(date: Date | string, format: 'short' | 'long' | 'time' | 'datetime' = 'short') {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const locale = i18n.language;
    
    const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
      short: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
      time: { hour: '2-digit', minute: '2-digit' },
      datetime: { 
        year: 'numeric', month: 'short', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      }
    };

    return new Intl.DateTimeFormat(locale, formatOptions[format]).format(dateObj);
  }

  /**
   * Number formatting with locale
   * Addresses Challenge 5: Regional number formatting
   */
  static formatNumber(
    number: number, 
    type: 'decimal' | 'currency' | 'percent' = 'decimal',
    currency = 'USD'
  ) {
    const locale = i18n.language;
    
    switch (type) {
      case 'currency':
        return new Intl.NumberFormat(locale, { 
          style: 'currency', 
          currency 
        }).format(number);
      case 'percent':
        return new Intl.NumberFormat(locale, { 
          style: 'percent' 
        }).format(number);
      default:
        return new Intl.NumberFormat(locale).format(number);
    }
  }

  /**
   * Relative time formatting (e.g., "2 hours ago")
   */
  static formatRelativeTime(date: Date | string) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const locale = i18n.language;
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    
    const now = new Date();
    const diffInSeconds = (dateObj.getTime() - now.getTime()) / 1000;
    const diffInMinutes = diffInSeconds / 60;
    const diffInHours = diffInMinutes / 60;
    const diffInDays = diffInHours / 24;

    if (Math.abs(diffInDays) >= 1) {
      return rtf.format(Math.round(diffInDays), 'day');
    } else if (Math.abs(diffInHours) >= 1) {
      return rtf.format(Math.round(diffInHours), 'hour');
    } else {
      return rtf.format(Math.round(diffInMinutes), 'minute');
    }
  }

  /**
   * Get currency symbol for current locale
   */
  static getCurrencySymbol(currency = 'USD') {
    const locale = i18n.language;
    return new Intl.NumberFormat(locale, { 
      style: 'currency', 
      currency 
    }).formatToParts(0).find(part => part.type === 'currency')?.value || '$';
  }
}