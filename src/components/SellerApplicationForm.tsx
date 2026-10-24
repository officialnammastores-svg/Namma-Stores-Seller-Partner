import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  Phone,
  Info,
  Mail,
  ChevronDown,
  Clock,
  Sparkles,
  ExternalLink,
  X,
  MapPin,
  Copy,
  Check,
  FileText,
} from 'lucide-react';
import {
  DISPLAY_CATEGORIES,
  PROGRAMME_PREFERENCE_OPTIONS,
  REFERRAL_SOURCE_OPTIONS,
  CONTACT_OPTIONS,
  TARGET_LOCATION_ACCURACY_METERS,
  LOCATION_WATCH_TIMEOUT_MS,
  validateSellerForm,
  normalizeIndianMobile,
  isValidEmail,
  validateGoogleMapsLink,
  isValidGeolocationReading,
  isLocationAccuracyAcceptable,
  selectBetterGeolocationReading,
  formatAccuracyMeters,
  buildCoordinatesMapsUrl,
  hasManualGoogleMapsLink,
  type DisplayCategory,
  type FormInputState,
  type GeolocationReading,
} from '../utils/rules.ts';
import {
  OFFICIAL_WHATSAPP_SELLER_COMMUNITY_URL,
  OFFICIAL_INSTAGRAM_URL,
  InstagramIcon,
} from './Navbar.tsx';
import { extractUTMParams, trackEvent } from '../lib/analytics.ts';
import type {
  EdgeFunctionResponse,
  ProgrammePreferenceOption,
  ReferralSourceOption,
} from '../types/seller.ts';

interface SellerFormProps {
  onOpenPrivacyNotice: () => void;
  onOpenCommercialTerms?: () => void;
  preselectedCategory?: DisplayCategory | '';
  preselectedProgramme?: ProgrammePreferenceOption | '';
}

const ORDERED_FORM_FIELDS: (keyof FormInputState)[] = [
  'shop_name',
  'owner_name',
  'mobile',
  'email',
  'shop_address',
  'google_maps_link',
  'shop_category',
  'programme_preference',
  'referral_source',
  'referral_source_other',
  'contact_preference',
  'privacy_acknowledged',
];

const SUBMISSION_REQUEST_TIMEOUT_MS = 20000;

function generateClientSubmissionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const SellerApplicationForm: React.FC<SellerFormProps> = ({
  onOpenPrivacyNotice,
  onOpenCommercialTerms,
  preselectedCategory,
  preselectedProgramme,
}) => {
  const shouldReduceMotion = useReducedMotion();

  const [formData, setFormData] = useState<FormInputState>({
    shop_name: '',
    owner_name: '',
    mobile: '',
    email: '',
    shop_address: '',
    google_maps_link: '',
    shop_category: '',
    programme_preference: '',
    referral_source: '',
    referral_source_other: '',
    contact_preference: 'WhatsApp',
    privacy_acknowledged: false,
    website_url: '',
  });

  const [geoState, setGeoState] = useState<{
    status:
      | 'idle'
      | 'confirm_overwrite'
      | 'locating'
      | 'success'
      | 'inaccurate'
      | 'error';
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    mapsUrl?: string;
    bestRejectedAccuracy?: number;
    message?: string;
  }>({ status: 'idle' });

  const watchIdRef = useRef<number | null>(null);
  const watchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLocatingRef = useRef<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);

  const [clientSubmissionId, setClientSubmissionId] = useState<string>(() =>
    generateClientSubmissionId()
  );
  const [formStarted, setFormStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submissionSuccess, setSubmissionSuccess] =
    useState<EdgeFunctionResponse | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string>('');
  const [copiedLeadId, setCopiedLeadId] = useState(false);

  const clearActiveLocationWatch = useCallback(() => {
    if (watchTimeoutRef.current !== null) {
      clearTimeout(watchTimeoutRef.current);
      watchTimeoutRef.current = null;
    }
    if (
      watchIdRef.current !== null &&
      typeof navigator !== 'undefined' &&
      'geolocation' in navigator &&
      typeof navigator.geolocation.clearWatch === 'function'
    ) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    isLocatingRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      clearActiveLocationWatch();
    };
  }, [clearActiveLocationWatch]);

  useEffect(() => {
    if (preselectedCategory) {
      setFormData((prev) => ({
        ...prev,
        shop_category: preselectedCategory,
      }));
      setErrors((prev) => {
        if (!prev.shop_category) return prev;
        const next = { ...prev };
        delete next.shop_category;
        return next;
      });
    }
  }, [preselectedCategory]);

  useEffect(() => {
    if (preselectedProgramme) {
      setFormData((prev) => ({
        ...prev,
        programme_preference: preselectedProgramme,
      }));
      setErrors((prev) => {
        if (!prev.programme_preference) return prev;
        const next = { ...prev };
        delete next.programme_preference;
        return next;
      });
    }
  }, [preselectedProgramme]);

  // Allow closing the success popup with Escape key
  useEffect(() => {
    if (!showSuccessModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSuccessModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSuccessModal]);

  const focusFirstInvalidField = useCallback(
    (fieldErrors: Record<string, string>) => {
      if (typeof document === 'undefined') return;
      const firstInvalidKey = ORDERED_FORM_FIELDS.find((key) =>
        Boolean(fieldErrors[key])
      );
      if (!firstInvalidKey) return;

      requestAnimationFrame(() => {
        const element = document.getElementById(firstInvalidKey);
        if (element) {
          element.scrollIntoView({
            behavior: shouldReduceMotion ? 'auto' : 'smooth',
            block: 'center',
          });
          element.focus({ preventScroll: true });
        }
      });
    },
    [shouldReduceMotion]
  );

  const handleFocus = useCallback(() => {
    setFormStarted((prev) => {
      if (!prev) {
        trackEvent('form_start', { form_id: 'seller_quick_application' });
      }
      return true;
    });
  }, []);

  const handleChange = useCallback(
    (field: keyof FormInputState, value: string | boolean) => {
      handleFocus();
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        ...(field === 'referral_source' && value !== 'Other'
          ? { referral_source_other: '' }
          : {}),
      }));
      setErrors((prev) => {
        if (!prev[field] && !prev.submit) return prev;
        const next = { ...prev };
        delete next[field];
        delete next.submit;
        return next;
      });
    },
    [handleFocus]
  );

  const handleBlur = useCallback(
    (
      field:
        | 'shop_name'
        | 'owner_name'
        | 'mobile'
        | 'email'
        | 'shop_address'
        | 'google_maps_link'
    ) => {
      setErrors((prev) => {
        const next = { ...prev };
        if (field === 'shop_name') {
          const val = formData.shop_name.trim();
          if (val.length > 0 && val.length < 2) {
            next.shop_name =
              'Please enter your shop name (at least 2 characters).';
          } else {
            delete next.shop_name;
          }
        } else if (field === 'owner_name') {
          const val = formData.owner_name.trim();
          if (val.length > 0 && val.length < 2) {
            next.owner_name =
              "Please enter the owner's full name (at least 2 characters).";
          } else {
            delete next.owner_name;
          }
        } else if (field === 'mobile') {
          const val = formData.mobile.trim();
          if (val.length > 0 && !normalizeIndianMobile(val).valid) {
            next.mobile =
              'Please enter a valid 10-digit Indian mobile number (starting with 6-9).';
          } else {
            delete next.mobile;
          }
        } else if (field === 'email') {
          const val = formData.email.trim();
          if (val.length > 0 && !isValidEmail(val)) {
            next.email = 'Please enter a valid email address.';
          } else {
            delete next.email;
          }
        } else if (field === 'shop_address') {
          const val = formData.shop_address.trim();
          if (val.length > 0 && val.length < 8) {
            next.shop_address =
              'Please enter complete shop address with landmark (at least 8 characters).';
          } else {
            delete next.shop_address;
          }
        } else if (field === 'google_maps_link') {
          const val = (formData.google_maps_link || '').trim();
          if (val.length > 0) {
            const check = validateGoogleMapsLink(val);
            if (!check.valid) {
              next.google_maps_link =
                check.error || 'Please paste a valid Google Maps link.';
            } else {
              delete next.google_maps_link;
            }
          } else {
            delete next.google_maps_link;
          }
        }
        return next;
      });
    },
    [formData]
  );

  const handleCopyLeadId = useCallback((leadId: string) => {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      navigator.clipboard.writeText(leadId).then(() => {
        setCopiedLeadId(true);
        setTimeout(() => setCopiedLeadId(false), 2500);
      });
    }
  }, []);

  const startLocationCapture = useCallback(() => {
    handleFocus();
    if (isLocatingRef.current) return;

    trackEvent('cta_click', { placement: 'form_use_current_location' });

    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setGeoState((prev) => ({
        ...prev,
        status: 'error',
        bestRejectedAccuracy: undefined,
        message:
          'Location access requires a secure HTTPS connection. Please open the secure HTTPS website and allow location permission in your browser settings, or enter your shop address and Google Maps link manually.',
      }));
      return;
    }

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGeoState((prev) => ({
        ...prev,
        status: 'error',
        bestRejectedAccuracy: undefined,
        message:
          'Location services are not supported on this browser. Please enter your complete shop address and paste your Google Maps link manually below.',
      }));
      return;
    }

    clearActiveLocationWatch();
    isLocatingRef.current = true;

    setGeoState((prev) => ({
      ...prev,
      status: 'locating',
      bestRejectedAccuracy: undefined,
      message: 'Finding your location...',
    }));

    let bestReading: GeolocationReading | null = null;
    let settled = false;

    const finishWithInaccurateReading = (reading: GeolocationReading) => {
      if (settled) return;
      settled = true;
      clearActiveLocationWatch();
      const approxMeters = formatAccuracyMeters(reading.accuracy);
      setGeoState((prev) => ({
        ...prev,
        status: 'inaccurate',
        bestRejectedAccuracy: reading.accuracy,
        message: `Reported location accuracy is approximately ${approxMeters} metres, which is not accurate enough to pinpoint your shop (we require ${TARGET_LOCATION_ACCURACY_METERS} metres or better). Your Google Maps link was not changed. Please step near an open doorway or window at your shop and tap Retry, or enter your Complete Shop Address and paste your Google Maps link manually.`,
      }));
    };

    const finishWithError = (errorMessage: string) => {
      if (settled) return;
      settled = true;
      clearActiveLocationWatch();
      setGeoState((prev) => ({
        ...prev,
        status: 'error',
        bestRejectedAccuracy: undefined,
        message: errorMessage,
      }));
    };

    watchTimeoutRef.current = setTimeout(() => {
      if (settled) return;
      if (bestReading) {
        finishWithInaccurateReading(bestReading);
      } else {
        finishWithError(
          'Location request timed out before a reliable GPS signal was found. Please check that GPS / High Accuracy Location is enabled and tap Retry, or enter your shop address and Google Maps link manually.'
        );
      }
    }, LOCATION_WATCH_TIMEOUT_MS);

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position: GeolocationPosition) => {
          if (settled) return;
          if (!isValidGeolocationReading(position?.coords)) {
            return;
          }

          const reading: GeolocationReading = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };

          bestReading = selectBetterGeolocationReading(bestReading, reading);

          if (
            isLocationAccuracyAcceptable(
              reading.accuracy,
              TARGET_LOCATION_ACCURACY_METERS
            )
          ) {
            settled = true;
            clearActiveLocationWatch();

            const mapsUrl = buildCoordinatesMapsUrl(
              reading.latitude,
              reading.longitude
            );
            const approxMeters = formatAccuracyMeters(reading.accuracy);

            handleChange('google_maps_link', mapsUrl);
            setGeoState({
              status: 'success',
              latitude: reading.latitude,
              longitude: reading.longitude,
              accuracy: reading.accuracy,
              mapsUrl,
              bestRejectedAccuracy: undefined,
              message: `Location captured — reported accuracy approximately ${approxMeters} metres.`,
            });
            trackEvent('cta_click', {
              placement: 'form_geolocation_captured',
            });
          }
        },
        (err: GeolocationPositionError) => {
          if (settled) return;

          if (err.code === 1) {
            if (
              /permissions policy|disabled in this document/i.test(
                err.message || ''
              )
            ) {
              finishWithError(
                'Location access is blocked by the current browser frame policy. Please open the website directly in a new browser tab over HTTPS and allow location permission, or paste your Google Maps link below.'
              );
            } else {
              finishWithError(
                'Location permission was denied. Please allow location access for this site in your browser settings and try again, or enter your shop address and Google Maps link manually.'
              );
            }
            return;
          }

          if (bestReading) {
            finishWithInaccurateReading(bestReading);
            return;
          }

          if (err.code === 2) {
            finishWithError(
              'Your device could not determine its current position. Please check that Location Services / GPS are turned on and tap Retry, or enter your shop address and Google Maps link manually.'
            );
            return;
          }

          if (err.code === 3) {
            finishWithError(
              'Location request timed out. Please try again in an area with better GPS signal, or enter your shop address and Google Maps link manually.'
            );
            return;
          }

          finishWithError(
            'Could not determine your current location. Please enter your complete shop address or paste your Google Maps link manually.'
          );
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: LOCATION_WATCH_TIMEOUT_MS,
        }
      );
    } catch {
      finishWithError(
        'Could not start location capture on this device. Please enter your complete shop address and paste your Google Maps link manually.'
      );
    }
  }, [clearActiveLocationWatch, handleChange, handleFocus]);

  const handleUseCurrentLocation = useCallback(() => {
    handleFocus();
    if (isLocatingRef.current || geoState.status === 'locating') return;

    if (hasManualGoogleMapsLink(formData.google_maps_link, geoState.mapsUrl)) {
      setGeoState((prev) => ({
        ...prev,
        status: 'confirm_overwrite',
        message:
          'You have already entered a Google Maps link manually. Do you want to capture your current device location and replace that link (only if accuracy is within 50 metres)?',
      }));
      return;
    }

    startLocationCapture();
  }, [
    formData.google_maps_link,
    geoState.mapsUrl,
    geoState.status,
    handleFocus,
    startLocationCapture,
  ]);

  const handleCancelOverwrite = useCallback(() => {
    setGeoState((prev) => ({
      ...prev,
      status: prev.mapsUrl ? 'success' : 'idle',
      message: prev.mapsUrl
        ? `Location captured — reported accuracy approximately ${formatAccuracyMeters(
            prev.accuracy || TARGET_LOCATION_ACCURACY_METERS
          )} metres.`
        : undefined,
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isSubmittingRef.current) return;

    trackEvent('form_submit_attempt');

    // Honeypot check for automated bots
    if (formData.website_url && formData.website_url.trim().length > 0) {
      return;
    }

    const hasAcceptedDeviceLocation =
      typeof geoState.latitude === 'number' &&
      typeof geoState.longitude === 'number' &&
      typeof geoState.accuracy === 'number' &&
      isLocationAccuracyAcceptable(
        geoState.accuracy,
        TARGET_LOCATION_ACCURACY_METERS
      ) &&
      Boolean(geoState.mapsUrl) &&
      (formData.google_maps_link || '').trim() ===
        (geoState.mapsUrl || '').trim();

    const trimmedMapsLink = (formData.google_maps_link || '').trim();

    const submissionInput: FormInputState = {
      ...formData,
      shop_latitude: hasAcceptedDeviceLocation ? geoState.latitude : null,
      shop_longitude: hasAcceptedDeviceLocation ? geoState.longitude : null,
      location_accuracy_meters: hasAcceptedDeviceLocation
        ? geoState.accuracy
        : null,
      location_capture_method: hasAcceptedDeviceLocation
        ? 'device_geolocation'
        : trimmedMapsLink
          ? 'google_maps_link'
          : 'manual_address',
    };

    const validation = validateSellerForm(submissionInput);
    if (!validation.isValid || !validation.payload) {
      setErrors(validation.errors);
      focusFirstInvalidField(validation.errors);
      return;
    }

    setErrors({});
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const utm = extractUTMParams();
    const finalPayload = {
      ...validation.payload,
      client_submission_id: clientSubmissionId,
      landing_page: typeof window !== 'undefined' ? window.location.href : '',
      referrer:
        typeof document !== 'undefined' ? document.referrer || 'direct' : 'direct',
      utm_source: utm.utm_source || '',
      utm_medium: utm.utm_medium || '',
      utm_campaign: utm.utm_campaign || '',
      utm_content: utm.utm_content || '',
      utm_term: utm.utm_term || '',
    };

    const controller =
      typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller
      ? setTimeout(() => controller.abort(), SUBMISSION_REQUEST_TIMEOUT_MS)
      : null;

    try {
      const res = await fetch('/api/submit-seller-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalPayload),
        signal: controller?.signal,
      });

      const data: EdgeFunctionResponse & {
        success?: boolean;
        errors?: Record<string, string>;
        message?: string;
        notification?: { email?: 'sent' | 'failed' | 'skipped' | 'pending' };
      } = await res.json().catch(() => ({}));

      if (!res.ok || data.error || data.success === false) {
        const errMessage =
          data.error ||
          data.message ||
          'We could not save your application right now. Please check your details and try again.';
        if (data.errors && typeof data.errors === 'object') {
          const nextErrors = {
            ...data.errors,
            submit: errMessage,
          };
          setErrors(nextErrors);
          focusFirstInvalidField(nextErrors);
        } else {
          setErrors({
            submit: errMessage,
          });
        }
        return;
      }

      const resolvedEmailStatus =
        data.email_status || data.notification?.email || 'failed';

      setSubmittedEmail(validation.payload.email);
      setSubmissionSuccess({
        ...data,
        email_status: resolvedEmailStatus,
      });
      setShowSuccessModal(true);
      trackEvent('application_submitted_success', {
        category: formData.shop_category,
        programme_preference:
          validation.payload.programme_preference || 'unspecified',
        referral_source: validation.payload.referral_source || 'unspecified',
      });
    } catch (err: unknown) {
      const isAbort =
        err instanceof Error &&
        (err.name === 'AbortError' || /aborted|timeout/i.test(err.message));
      setErrors({
        submit: isAbort
          ? 'The request took longer than expected. Your entered details are preserved—please tap Submit Application again to retry safely.'
          : 'Unable to save your application due to a network connection issue. Your details are preserved—please check your internet connection and tap Submit Application again.',
      });
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    clearActiveLocationWatch();
    setFormData({
      shop_name: '',
      owner_name: '',
      mobile: '',
      email: '',
      shop_address: '',
      google_maps_link: '',
      shop_category: '',
      programme_preference: '',
      referral_source: '',
      referral_source_other: '',
      contact_preference: 'WhatsApp',
      privacy_acknowledged: false,
      website_url: '',
    });
    setGeoState({ status: 'idle' });
    setClientSubmissionId(generateClientSubmissionId());
    setSubmissionSuccess(null);
    setShowSuccessModal(false);
    setSubmittedEmail('');
    setCopiedLeadId(false);
    setErrors({});
  };

  const resolvedEmailStatus: 'sent' | 'failed' | 'skipped' | 'pending' =
    submissionSuccess?.email_status ||
    (
      submissionSuccess as {
        notification?: { email?: 'sent' | 'failed' | 'skipped' | 'pending' };
      } | null
    )?.notification?.email ||
    'failed';

  return (
    <section
      id="apply-form"
      className="relative py-12 sm:py-20 bg-gradient-to-b from-[#FFF9EF] via-[#FFF4E3]/45 to-[#FFF9EF] border-b border-[#174D35]/10 overflow-hidden"
    >
      {/* Layered Ambient Orbs Framing the Seller Application Form */}
      <div
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0"
      >
        <div className="absolute inset-0 bg-ns-subtle-grid opacity-40" />
        <div
          className="animate-ns-orb-1 absolute top-8 -left-24 w-[24rem] sm:w-[32rem] h-[24rem] sm:h-[32rem] rounded-full blur-2xl sm:blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(47, 133, 90, 0.18) 0%, rgba(229, 244, 232, 0.65) 48%, rgba(255, 249, 239, 0) 75%)',
          }}
        />
        <div
          className="animate-ns-orb-2 absolute bottom-4 -right-24 w-[24rem] sm:w-[32rem] h-[24rem] sm:h-[32rem] rounded-full blur-2xl sm:blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(255, 159, 67, 0.17) 0%, rgba(255, 244, 227, 0.6) 50%, rgba(255, 249, 239, 0) 75%)',
          }}
        />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="text-center space-y-2 mb-5 sm:mb-7"
        >
          <div className="text-xs font-extrabold uppercase tracking-wider text-[#2F855A]">
            Seller Application
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#174D35] tracking-tight text-balance">
            Apply to Become a Seller Partner
          </h2>
          <p className="text-xs sm:text-sm text-[#4A5950] max-w-lg mx-auto leading-relaxed">
            Share your store details below. Our Whitefield onboarding team reviews every application within 1–2 business days and walks you through commercial terms before activation.
          </p>
        </motion.div>

        {/* Concise Pre-Application Checklist Bar (Replaces repetitive full-size 35-day banner) */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mb-5 sm:mb-6 rounded-2xl bg-[#174D35] text-white p-4 sm:p-5 border border-[#2F855A]/45 shadow-[0_8px_24px_rgba(23,77,53,0.14)]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FFF9EF] text-[#174D35] flex items-center justify-center shrink-0 border border-[#FF9F43]">
                <Sparkles className="w-4 h-4 text-[#174D35]" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-white leading-snug">
                  35 Days at ₹0 Platform Charges · ₹0 Onboarding Fee
                </h3>
                <p className="text-[11px] text-[#E5F4E8]/90 mt-0.5 leading-snug">
                  Trial begins once your store is verified and activated live on Namma Stores. No document uploads required right now.
                </p>
              </div>
            </div>

            {onOpenCommercialTerms && (
              <button
                type="button"
                onClick={onOpenCommercialTerms}
                className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/12 hover:bg-white/20 border border-white/25 text-[11px] font-bold text-[#FFF9EF] transition-colors shrink-0 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[#FF9F43]" />
                <span>Commercial Terms</span>
              </button>
            )}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* Success Confirmation State */}
          {submissionSuccess ? (
            <motion.div
              key="application-success-panel"
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              role="status"
              aria-live="polite"
              className="bg-white rounded-3xl border border-[#2F855A]/30 p-6 sm:p-8 space-y-5 shadow-elevated relative overflow-hidden"
            >
              {/* Top Brand Accent Bar */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#174D35] via-[#2F855A] to-[#FF9F43]" />

              <div className="flex items-start gap-4 pt-1">
                <motion.div
                  initial={shouldReduceMotion ? false : { scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    duration: 0.35,
                    delay: shouldReduceMotion ? 0 : 0.08,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="w-12 h-12 rounded-2xl bg-[#E5F4E8] text-[#174D35] flex items-center justify-center shrink-0 border border-[#2F855A]/30 shadow-xs"
                >
                  <CheckCircle2 className="w-7 h-7 text-[#2F855A]" />
                </motion.div>
                <div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[#E5F4E8] text-[#174D35] text-[10px] font-extrabold uppercase tracking-wider border border-[#2F855A]/30 mb-1">
                    Status: Received — Pending Onboarding Review
                  </span>
                  <h3 className="text-lg sm:text-xl font-extrabold text-[#174D35] leading-tight">
                    Application Saved Successfully!
                  </h3>
                  <p className="text-xs sm:text-sm font-semibold text-[#2F855A] mt-1">
                    Thank you for choosing Namma Stores. Your seller partner application is recorded in our system.
                  </p>
                </div>
              </div>

              <div className="bg-[#FFF9EF] rounded-2xl p-5 border border-[#174D35]/12 space-y-3.5 text-xs sm:text-sm text-[#202820] leading-relaxed">
                {/* Reference ID & Registered Email Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-[#174D35]/10">
                  {submissionSuccess.lead_id && (
                    <div className="bg-white p-3 rounded-xl border border-[#174D35]/12 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A5950] block">
                          Application Reference ID
                        </span>
                        <span className="text-xs font-extrabold text-[#174D35] font-mono truncate block mt-0.5">
                          {submissionSuccess.lead_id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyLeadId(
                            submissionSuccess.lead_id!.slice(0, 8).toUpperCase()
                          )
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-[#FFF9EF] hover:bg-[#E5F4E8] border border-[#174D35]/15 text-[11px] font-bold text-[#174D35] inline-flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                        title="Copy Reference ID"
                      >
                        {copiedLeadId ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#2F855A]" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-[#174D35]" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  <div className="bg-white p-3 rounded-xl border border-[#174D35]/12 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A5950] block">
                      Registered Email
                    </span>
                    <span className="text-xs font-bold text-[#174D35] truncate block mt-0.5">
                      {submittedEmail}
                    </span>
                  </div>
                </div>

                {/* Next Steps Timeline */}
                <div className="space-y-2">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#174D35]">
                    What Happens Next
                  </div>
                  <ol className="space-y-1.5 text-xs text-[#202820]">
                    <li className="flex items-start gap-2">
                      <span className="font-extrabold text-[#2F855A] tabular-nums">1.</span>
                      <span>
                        <strong>Application &amp; Category Review (1–2 Business Days):</strong> Our Whitefield team reviews your store details, location, and category eligibility.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-extrabold text-[#2F855A] tabular-nums">2.</span>
                      <span>
                        <strong>Seller App Access &amp; Identity/Bank Verification:</strong> Once your application is verified, our onboarding team guides you through Seller App access, identity verification (including Aadhaar), and bank settlement setup.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-extrabold text-[#2F855A] tabular-nums">3.</span>
                      <span>
                        <strong>Final Onboarding &amp; Store Activation:</strong> After completing verification and catalogue setup, your store goes live and your 35 days of ₹0 platform charges begin.
                      </span>
                    </li>
                  </ol>
                </div>

                {/* Accurate Email Delivery Status Message */}
                {resolvedEmailStatus === 'sent' && (
                  <div className="flex items-start gap-2.5 pt-2.5 border-t border-[#174D35]/10 text-xs text-[#202820]">
                    <Mail className="w-4 h-4 text-[#2F855A] shrink-0 mt-0.5" />
                    <p>
                      <strong>Email Confirmation Dispatched:</strong> Our email provider accepted your acknowledgement email to <strong>{submittedEmail}</strong>. Please check your inbox or spam/promotions folder.
                    </p>
                  </div>
                )}

                {resolvedEmailStatus === 'failed' && (
                  <div className="flex items-start gap-2.5 pt-2.5 border-t border-[#174D35]/10 text-xs text-[#202820]">
                    <AlertCircle className="w-4 h-4 text-[#FF9F43] shrink-0 mt-0.5" />
                    <p>
                      <strong>Application Saved (Email Pending):</strong> Your application is safely recorded in our database, though the automated confirmation email could not be dispatched right now. Our onboarding team has your details and will contact you directly.
                    </p>
                  </div>
                )}

                {resolvedEmailStatus === 'skipped' && (
                  <div className="flex items-start gap-2.5 pt-2.5 border-t border-[#174D35]/10 text-xs text-[#202820]">
                    <Info className="w-4 h-4 text-[#2F855A] shrink-0 mt-0.5" />
                    <p>
                      <strong>Duplicate Submission Reconciled:</strong> An application for this store was already recorded recently, so we linked this request to your existing application without sending a duplicate email.
                    </p>
                  </div>
                )}

                {resolvedEmailStatus === 'pending' && (
                  <div className="flex items-start gap-2.5 pt-2.5 border-t border-[#174D35]/10 text-xs text-[#202820]">
                    <Clock className="w-4 h-4 text-[#FF9F43] shrink-0 mt-0.5" />
                    <p>
                      Your confirmation email is queued for delivery. Our team will also follow up via your preferred contact method.
                    </p>
                  </div>
                )}

                <p className="text-[11px] text-[#4A5950] pt-2 border-t border-[#174D35]/10">
                  Need immediate assistance? Call or WhatsApp our merchant team at{' '}
                  <a
                    href="tel:+919180567632"
                    className="font-bold text-[#174D35] underline underline-offset-2"
                  >
                    +91 9180567632
                  </a>{' '}
                  or email{' '}
                  <a
                    href="mailto:official.nammastores@gmail.com"
                    className="font-bold text-[#174D35] underline underline-offset-2"
                  >
                    official.nammastores@gmail.com
                  </a>
                  .
                </p>
              </div>

              {/* Community & Social Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <a
                  href={OFFICIAL_WHATSAPP_SELLER_COMMUNITY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackEvent('cta_click', {
                      placement: 'success_panel_whatsapp_community',
                    })
                  }
                  className="px-5 py-3 bg-[#174D35] hover:bg-[#2F855A] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <MessageSquare className="w-4 h-4 text-[#FF9F43] shrink-0" />
                  <span>Join WhatsApp Seller Community</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80 shrink-0" />
                </a>

                <a
                  href={OFFICIAL_INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackEvent('cta_click', {
                      placement: 'success_panel_instagram',
                    })
                  }
                  className="px-5 py-3 bg-[#FFF9EF] hover:bg-[#E5F4E8] border border-[#174D35]/20 text-[#174D35] font-bold text-xs sm:text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <InstagramIcon className="w-4 h-4 text-[#2F855A] shrink-0" />
                  <span>Follow Us on Instagram</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70 shrink-0" />
                </a>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#174D35]/10">
                <span className="text-xs text-[#4A5950]">
                  Registering another shop or branch?
                </span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-[#FFF9EF] border border-[#174D35]/20 text-xs font-bold text-[#174D35] rounded-xl transition-colors cursor-pointer"
                >
                  Submit Another Store
                </button>
              </div>
            </motion.div>
          ) : (
            /* Application Form Card with Subtle Breathing Halo */
            <motion.div
              key="application-form-panel"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div
                aria-hidden="true"
                className="animate-ns-halo absolute -inset-3 rounded-[2rem] blur-2xl pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle at 50% 35%, rgba(47, 133, 90, 0.16) 0%, rgba(229, 244, 232, 0.5) 50%, rgba(255, 159, 67, 0.12) 85%, transparent 100%)',
                }}
              />
              <div className="relative bg-white/95 backdrop-blur-md rounded-3xl border border-[#174D35]/15 p-6 sm:p-8 shadow-elevated overflow-hidden">
                {/* Top Brand Accent Bar */}
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#174D35] via-[#2F855A] to-[#FF9F43]" />

                <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-[#174D35]/10 text-[11px] text-[#4A5950]">
                  <span className="font-semibold">
                    Fields marked with <span className="text-rose-600 font-bold">*</span> are required
                  </span>
                  <span className="font-semibold text-[#174D35]">
                    Takes ~60 seconds
                  </span>
                </div>

                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  {/* Honeypot field (hidden from real users) */}
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="website_url">Website</label>
                    <input
                      id="website_url"
                      name="website_url"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={formData.website_url || ''}
                      onChange={(e) => handleChange('website_url', e.target.value)}
                    />
                  </div>

                  {/* Shop Name */}
                  <div>
                    <label
                      htmlFor="shop_name"
                      className="block text-xs font-bold text-[#174D35] mb-1.5"
                    >
                      Shop Name <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="shop_name"
                      name="shop_name"
                      type="text"
                      autoComplete="organization"
                      required
                      maxLength={120}
                      aria-invalid={Boolean(errors.shop_name)}
                      aria-describedby={
                        errors.shop_name ? 'shop_name-error' : undefined
                      }
                      placeholder="e.g., Sri Vinayaka Provision Store"
                      value={formData.shop_name}
                      onChange={(e) => handleChange('shop_name', e.target.value)}
                      onBlur={() => handleBlur('shop_name')}
                      className={`w-full h-12 px-4 bg-white border rounded-xl text-[#202820] text-sm focus:outline-none focus:ring-2 transition-all ${
                        errors.shop_name
                          ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/20'
                          : 'border-[#174D35]/20 hover:border-[#174D35]/40 focus:border-[#174D35] focus:ring-[#2F855A]/20'
                      }`}
                    />
                    {errors.shop_name && (
                      <p
                        id="shop_name-error"
                        role="alert"
                        className="text-xs text-rose-600 mt-1.5 font-medium"
                      >
                        {errors.shop_name}
                      </p>
                    )}
                  </div>

                  {/* Owner's Full Name */}
                  <div>
                    <label
                      htmlFor="owner_name"
                      className="block text-xs font-bold text-[#174D35] mb-1.5"
                    >
                      Owner&apos;s Full Name <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="owner_name"
                      name="owner_name"
                      type="text"
                      autoComplete="name"
                      required
                      maxLength={100}
                      aria-invalid={Boolean(errors.owner_name)}
                      aria-describedby={
                        errors.owner_name ? 'owner_name-error' : undefined
                      }
                      placeholder="Enter owner's full name"
                      value={formData.owner_name}
                      onChange={(e) => handleChange('owner_name', e.target.value)}
                      onBlur={() => handleBlur('owner_name')}
                      className={`w-full h-12 px-4 bg-white border rounded-xl text-[#202820] text-sm focus:outline-none focus:ring-2 transition-all ${
                        errors.owner_name
                          ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/20'
                          : 'border-[#174D35]/20 hover:border-[#174D35]/40 focus:border-[#174D35] focus:ring-[#2F855A]/20'
                      }`}
                    />
                    {errors.owner_name && (
                      <p
                        id="owner_name-error"
                        role="alert"
                        className="text-xs text-rose-600 mt-1.5 font-medium"
                      >
                        {errors.owner_name}
                      </p>
                    )}
                  </div>

                  {/* Mobile Number & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="mobile"
                        className="block text-xs font-bold text-[#174D35] mb-1.5"
                      >
                        Mobile Number <span className="text-rose-600">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-xs font-bold text-[#4A5950] tabular-nums">
                          +91
                        </span>
                        <input
                          id="mobile"
                          name="mobile"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel-national"
                          required
                          maxLength={15}
                          aria-invalid={Boolean(errors.mobile)}
                          aria-describedby={
                            errors.mobile ? 'mobile-error' : undefined
                          }
                          placeholder="9845012345"
                          value={formData.mobile}
                          onChange={(e) => handleChange('mobile', e.target.value)}
                          onBlur={() => handleBlur('mobile')}
                          className={`w-full h-12 pl-12 pr-4 bg-white border rounded-xl text-[#202820] text-sm tabular-nums focus:outline-none focus:ring-2 transition-all ${
                            errors.mobile
                              ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/20'
                              : 'border-[#174D35]/20 hover:border-[#174D35]/40 focus:border-[#174D35] focus:ring-[#2F855A]/20'
                          }`}
                        />
                      </div>
                      {errors.mobile && (
                        <p
                          id="mobile-error"
                          role="alert"
                          className="text-xs text-rose-600 mt-1.5 font-medium"
                        >
                          {errors.mobile}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="block text-xs font-bold text-[#174D35] mb-1.5"
                      >
                        Email Address <span className="text-rose-600">*</span>
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        required
                        maxLength={254}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={
                          errors.email ? 'email-error' : undefined
                        }
                        placeholder="name@example.com"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        onBlur={() => handleBlur('email')}
                        className={`w-full h-12 px-4 bg-white border rounded-xl text-[#202820] text-sm focus:outline-none focus:ring-2 transition-all ${
                          errors.email
                            ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/20'
                            : 'border-[#174D35]/20 hover:border-[#174D35]/40 focus:border-[#174D35] focus:ring-[#2F855A]/20'
                        }`}
                      />
                      {errors.email && (
                        <p
                          id="email-error"
                          role="alert"
                          className="text-xs text-rose-600 mt-1.5 font-medium"
                        >
                          {errors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Store Address & Location Section */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#FFF9EF]/75 border border-[#174D35]/15 space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#2F855A] shrink-0" />
                        <h3 className="text-sm sm:text-base font-extrabold text-[#174D35] tracking-tight">
                          Store Address &amp; Location
                        </h3>
                      </div>
                      <p className="text-xs text-[#68776C] leading-relaxed">
                        Enter your complete shop address and share your shop&apos;s Google Maps location so our team can find your store and visit you for onboarding.
                      </p>
                    </div>

                    {/* Field 1: Complete Shop Address */}
                    <div>
                      <label
                        htmlFor="shop_address"
                        className="block text-xs font-bold text-[#174D35] mb-1.5"
                      >
                        Complete Shop Address <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        id="shop_address"
                        name="shop_address"
                        rows={3}
                        autoComplete="street-address"
                        required
                        maxLength={300}
                        aria-invalid={Boolean(errors.shop_address)}
                        aria-describedby={
                          errors.shop_address ? 'shop_address-error' : undefined
                        }
                        placeholder="Shop number, building, street, area, landmark, city and PIN code"
                        value={formData.shop_address}
                        onChange={(e) => handleChange('shop_address', e.target.value)}
                        onBlur={() => handleBlur('shop_address')}
                        className={`w-full p-3.5 bg-white border rounded-xl text-[#202820] text-sm focus:outline-none focus:ring-2 transition-all ${
                          errors.shop_address
                            ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/20'
                            : 'border-[#174D35]/18 hover:border-[#174D35]/35 focus:border-[#174D35] focus:ring-[#2F855A]/20'
                        }`}
                      />
                      {errors.shop_address && (
                        <p
                          id="shop_address-error"
                          role="alert"
                          className="text-xs text-rose-600 mt-1.5 font-medium"
                        >
                          {errors.shop_address}
                        </p>
                      )}
                    </div>

                    {/* Use My Current Location Action (Placed below Complete Shop Address and above Google Maps Location Link) */}
                    <div className="space-y-2.5">
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={handleUseCurrentLocation}
                          disabled={geoState.status === 'locating'}
                          aria-busy={geoState.status === 'locating'}
                          className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#174D35] hover:bg-[#2F855A] active:scale-[0.99] disabled:opacity-65 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#174D35] focus-visible:ring-offset-1"
                        >
                          {geoState.status === 'locating' ? (
                            <>
                              <RefreshCw className="w-4 h-4 text-[#FF9F43] animate-spin shrink-0" />
                              <span>Finding your location...</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="w-4 h-4 text-[#FF9F43] shrink-0" />
                              <span>Use My Current Location</span>
                            </>
                          )}
                        </button>
                        <p className="text-[11px] text-[#4A5950] leading-relaxed">
                          Standing at your shop? Tap &lsquo;Use My Current Location&rsquo; to share your location. You can also paste your shop&apos;s Google Maps link below so our team can find you easily.
                        </p>
                      </div>

                      {/* Visually Distinct Helper Note with Location-Pin Icon */}
                      <div className="p-3 rounded-xl bg-white/95 border border-[#2F855A]/25 flex items-start gap-2.5 shadow-[0_2px_8px_-4px_rgba(23,77,53,0.06)]">
                        <div className="w-7 h-7 rounded-lg bg-[#E5F4E8] border border-[#2F855A]/30 flex items-center justify-center shrink-0 mt-0.5">
                          <MapPin
                            className="w-3.5 h-3.5 text-[#174D35]"
                            aria-hidden="true"
                          />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <h4 className="text-xs font-extrabold text-[#174D35] leading-snug">
                            Help our team find your shop
                          </h4>
                          <p className="text-[11px] text-[#4A5950] leading-relaxed">
                            Please share the exact location of your store, not your home or current location if you are somewhere else. Our team will use the address and map link to locate your shop for onboarding.
                          </p>
                        </div>
                      </div>

                      {geoState.status === 'confirm_overwrite' && (
                        <div
                          role="alert"
                          className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2.5"
                        >
                          <div className="flex items-start gap-2">
                            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                            <span className="leading-snug">
                              {geoState.message}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 pl-6">
                            <button
                              type="button"
                              onClick={startLocationCapture}
                              className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#174D35] hover:bg-[#2F855A] text-white font-bold text-xs transition-colors cursor-pointer"
                            >
                              Replace with Current Location
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelOverwrite}
                              className="min-h-[36px] px-3 py-1.5 rounded-lg bg-white hover:bg-amber-100/60 border border-amber-300 text-amber-900 font-semibold text-xs transition-colors cursor-pointer"
                            >
                              Keep Manual Link
                            </button>
                          </div>
                        </div>
                      )}

                      {geoState.status === 'locating' && (
                        <div
                          role="status"
                          aria-live="polite"
                          className="p-3 rounded-xl bg-[#FFF4E3]/80 border border-[#174D35]/15 text-xs text-[#174D35] flex items-center gap-2"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-[#2F855A] animate-spin shrink-0" />
                          <span className="font-semibold">
                            {geoState.message || 'Finding your location...'}
                          </span>
                        </div>
                      )}

                      {geoState.status === 'success' && (
                        <div
                          role="status"
                          aria-live="polite"
                          className="p-3 rounded-xl bg-[#E5F4E8] border border-[#2F855A]/35 text-xs text-[#174D35] space-y-1"
                        >
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#2F855A] shrink-0 mt-0.5" />
                            <div className="min-w-0 space-y-0.5">
                              <span className="font-bold block leading-snug">
                                {geoState.message}
                              </span>
                              <span className="text-[11px] text-[#202820]/85 block leading-relaxed">
                                Please confirm you are currently at your shop and that your Complete Shop Address above matches your store location.
                              </span>
                              {typeof geoState.latitude === 'number' &&
                                typeof geoState.longitude === 'number' && (
                                  <span className="text-[11px] text-[#202820]/80 block pt-0.5 tabular-nums">
                                    Coordinates: {geoState.latitude.toFixed(6)},{' '}
                                    {geoState.longitude.toFixed(6)}
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>
                      )}

                      {(geoState.status === 'inaccurate' ||
                        geoState.status === 'error') &&
                        geoState.message && (
                          <div
                            role="alert"
                            className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2.5"
                          >
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div className="min-w-0 space-y-1">
                                <span className="leading-snug block">
                                  {geoState.message}
                                                                </span>
                                {geoState.status === 'inaccurate' &&
                                  typeof geoState.bestRejectedAccuracy ===
                                    'number' && (
                                    <span className="text-[11px] text-amber-800/90 font-semibold block tabular-nums">
                                      Reported accuracy: ~
                                      {formatAccuracyMeters(
                                        geoState.bestRejectedAccuracy
                                      )}{' '}
                                      metres (required: &le;{' '}
                                      {TARGET_LOCATION_ACCURACY_METERS} metres)
                                    </span>
                                  )}
                              </div>
                            </div>
                            <div className="pl-6">
                              <button
                                type="button"
                                onClick={startLocationCapture}
                                className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-[#174D35] hover:bg-[#2F855A] text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-[#FF9F43] shrink-0" />
                                <span>Retry</span>
                              </button>
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Field 2: Google Maps Location Link */}
                    <div className="pt-2 border-t border-[#174D35]/10">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <label
                          htmlFor="google_maps_link"
                          className="block text-xs font-bold text-[#174D35]"
                        >
                          Google Maps Location Link
                        </label>
                        <span className="text-[11px] font-semibold text-[#4A5950]">
                          Optional
                        </span>
                      </div>
                      <input
                        id="google_maps_link"
                        name="google_maps_link"
                        type="url"
                        inputMode="url"
                        maxLength={500}
                        aria-invalid={Boolean(errors.google_maps_link)}
                        aria-describedby={
                          errors.google_maps_link
                            ? 'google_maps_link-error google_maps_link-help'
                            : 'google_maps_link-help'
                        }
                        placeholder="Paste your shop's Google Maps share link"
                        value={formData.google_maps_link || ''}
                        onChange={(e) =>
                          handleChange('google_maps_link', e.target.value)
                        }
                        onBlur={() => handleBlur('google_maps_link')}
                        className={`w-full h-12 px-4 bg-white border rounded-xl text-[#202820] text-sm focus:outline-none focus:ring-2 transition-all ${
                          errors.google_maps_link
                            ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/20'
                            : 'border-[#174D35]/18 hover:border-[#174D35]/35 focus:border-[#174D35] focus:ring-[#2F855A]/20'
                        }`}
                      />
                      {errors.google_maps_link && (
                        <p
                          id="google_maps_link-error"
                          role="alert"
                          className="text-xs text-rose-600 mt-1.5 font-medium"
                        >
                          {errors.google_maps_link}
                        </p>
                      )}
                      <p
                        id="google_maps_link-help"
                        className="text-[11px] text-[#4A5950] mt-1.5 leading-relaxed"
                      >
                        Open Google Maps, find your shop, tap Share, and paste the link here.
                      </p>
                    </div>
                  </div>

                  {/* Shop Category Dropdown */}
                  <div>
                    <label
                      htmlFor="shop_category"
                      className="block text-xs font-bold text-[#174D35] mb-1.5"
                    >
                      Shop Category <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="shop_category"
                        name="shop_category"
                        required
                        aria-invalid={Boolean(errors.shop_category)}
                        aria-describedby={
                          errors.shop_category
                            ? 'shop_category-error shop_category-help'
                            : 'shop_category-help'
                        }
                        value={formData.shop_category}
                        onChange={(e) =>
                          handleChange(
                            'shop_category',
                            e.target.value as DisplayCategory
                          )
                        }
                        className={`w-full h-12 pl-4 pr-10 bg-white border rounded-xl text-[#202820] text-base sm:text-sm appearance-none truncate focus:outline-none focus:ring-2 transition-all ${
                          errors.shop_category
                            ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/20'
                            : 'border-[#174D35]/18 hover:border-[#174D35]/35 focus:border-[#174D35] focus:ring-[#2F855A]/20'
                        }`}
                      >
                        <option value="">Select what you sell</option>
                        {DISPLAY_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-[#4A5950] pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                    {errors.shop_category && (
                      <p
                        id="shop_category-error"
                        role="alert"
                        className="text-xs text-rose-600 mt-1.5 font-medium"
                      >
                        {errors.shop_category}
                      </p>
                    )}
                    <p
                      id="shop_category-help"
                      aria-live="polite"
                      className="text-xs text-[#4A5950] mt-1.5 leading-relaxed"
                    >
                      {formData.shop_category === 'Other or multiple categories'
                        ? 'Note: "Other or multiple categories" (including Bakery & Sweets, Restaurants & Quick Bites, or multi-category stores) requires an onboarding eligibility review by our team.'
                        : 'Running a bakery, sweet shop, quick-bite F&B outlet, or multi-category store? Select "Other or multiple categories" for an onboarding eligibility review.'}
                    </p>
                  </div>

                  {/* Preferred Seller Programme (Optional, synced with SellerProgrammes cards) */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label
                        htmlFor="programme_preference"
                        className="block text-xs font-bold text-[#174D35]"
                      >
                        Preferred Seller Programme
                      </label>
                      <span className="text-[11px] font-semibold text-[#4A5950]">
                        Optional
                      </span>
                    </div>
                    <div className="relative">
                      <select
                        id="programme_preference"
                        name="programme_preference"
                        aria-invalid={Boolean(errors.programme_preference)}
                        aria-describedby={
                          errors.programme_preference
                            ? 'programme_preference-error programme_preference-help'
                            : 'programme_preference-help'
                        }
                        value={formData.programme_preference || ''}
                        onChange={(e) =>
                          handleChange(
                            'programme_preference',
                            e.target.value as ProgrammePreferenceOption | ''
                          )
                        }
                        className={`w-full h-12 pl-4 pr-10 bg-white border rounded-xl text-[#202820] text-base sm:text-sm appearance-none truncate focus:outline-none focus:ring-2 transition-all ${
                          errors.programme_preference
                            ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/20'
                            : 'border-[#174D35]/18 hover:border-[#174D35]/35 focus:border-[#174D35] focus:ring-[#2F855A]/20'
                        }`}
                      >
                        <option value="">Select a programme (optional)</option>
                        {PROGRAMME_PREFERENCE_OPTIONS.map((prog) => (
                          <option key={prog.value} value={prog.value}>
                            {prog.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-[#4A5950] pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                    {errors.programme_preference && (
                      <p
                        id="programme_preference-error"
                        role="alert"
                        className="text-xs text-rose-600 mt-1.5 font-medium"
                      >
                        {errors.programme_preference}
                      </p>
                    )}
                    <p
                      id="programme_preference-help"
                      aria-live="polite"
                      className="text-xs text-[#4A5950] mt-1.5 leading-relaxed"
                    >
                      {PROGRAMME_PREFERENCE_OPTIONS.find(
                        (prog) => prog.value === formData.programme_preference
                      )?.description ||
                        'Choose a programme or decide with our team later.'}
                    </p>
                  </div>

                  {/* How did you hear about Namma Stores? Dropdown */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label
                        htmlFor="referral_source"
                        className="block text-xs font-bold text-[#174D35]"
                      >
                        How did you hear about Namma Stores?
                      </label>
                      <span className="text-[11px] font-semibold text-[#4A5950]">
                        Optional
                      </span>
                    </div>
                    <div className="relative">
                      <select
                        id="referral_source"
                        name="referral_source"
                        aria-invalid={Boolean(errors.referral_source)}
                        aria-describedby={
                          errors.referral_source
                            ? 'referral_source-error'
                            : undefined
                        }
                        value={formData.referral_source}
                        onChange={(e) =>
                          handleChange(
                            'referral_source',
                            e.target.value as ReferralSourceOption | ''
                          )
                        }
                        className={`w-full h-12 pl-4 pr-10 bg-white border rounded-xl text-[#202820] text-sm appearance-none focus:outline-none focus:ring-2 transition-all ${
                          errors.referral_source
                            ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/20'
                            : 'border-[#174D35]/18 hover:border-[#174D35]/35 focus:border-[#174D35] focus:ring-[#2F855A]/20'
                        }`}
                      >
                        <option value="">Select how you heard about us</option>
                        {REFERRAL_SOURCE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-[#4A5950] pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                    {errors.referral_source && (
                      <p
                        id="referral_source-error"
                        role="alert"
                        className="text-xs text-rose-600 mt-1.5 font-medium"
                      >
                        {errors.referral_source}
                      </p>
                    )}

                    {/* Conditional "Please specify" field when "Other" is selected */}
                    <AnimatePresence initial={false}>
                      {formData.referral_source === 'Other' && (
                        <motion.div
                          initial={
                            shouldReduceMotion
                              ? { opacity: 1 }
                              : { opacity: 0, height: 0, marginTop: 0 }
                          }
                          animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                          exit={
                            shouldReduceMotion
                              ? { opacity: 0 }
                              : { opacity: 0, height: 0, marginTop: 0 }
                          }
                          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <label
                            htmlFor="referral_source_other"
                            className="block text-xs font-bold text-[#174D35] mb-1.5"
                          >
                            Please specify
                          </label>
                          <input
                            id="referral_source_other"
                            name="referral_source_other"
                            type="text"
                            maxLength={120}
                            aria-invalid={Boolean(errors.referral_source_other)}
                            aria-describedby={
                              errors.referral_source_other
                                ? 'referral_source_other-error'
                                : undefined
                            }
                            placeholder="Tell us how you heard about Namma Stores (optional)"
                            value={formData.referral_source_other}
                            onChange={(e) =>
                              handleChange('referral_source_other', e.target.value)
                            }
                            className="w-full h-11 px-4 bg-[#FFF9EF]/70 border border-[#174D35]/18 rounded-xl text-[#202820] text-sm focus:bg-white focus:outline-none focus:border-[#174D35] focus:ring-2 focus:ring-[#2F855A]/20 transition-all"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Preferred Contact Method */}
                  <div>
                    <label
                      id="contact_preference-label"
                      className="block text-xs font-bold text-[#174D35] mb-2"
                    >
                      Preferred Contact Method <span className="text-rose-500">*</span>
                    </label>
                    <div
                      role="group"
                      aria-labelledby="contact_preference-label"
                      aria-describedby={
                        errors.contact_preference
                          ? 'contact_preference-error'
                          : undefined
                      }
                      className="grid grid-cols-2 gap-3"
                    >
                      {CONTACT_OPTIONS.map((method, idx) => {
                        const isSelected = formData.contact_preference === method;
                        return (
                          <button
                            key={method}
                            id={idx === 0 ? 'contact_preference' : undefined}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => handleChange('contact_preference', method)}
                            className={`h-12 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#2F855A]/30 ${
                              isSelected
                                ? 'bg-[#174D35] text-white border-[#174D35] shadow-xs'
                                : 'bg-white text-[#202820] border-[#174D35]/18 hover:bg-[#FFF9EF]'
                            }`}
                          >
                            {method === 'WhatsApp' ? (
                              <MessageSquare className="w-4 h-4 text-[#FF9F43]" />
                            ) : (
                              <Phone className="w-4 h-4 text-[#2F855A]" />
                            )}
                            <span>{method}</span>
                          </button>
                        );
                      })}
                    </div>
                    {errors.contact_preference && (
                      <p
                        id="contact_preference-error"
                        role="alert"
                        className="text-xs text-rose-600 mt-1.5 font-medium"
                      >
                        {errors.contact_preference}
                      </p>
                    )}
                  </div>

                  {/* Short Commission & Payment Information Statement */}
                  <div className="p-4 bg-[#FFF9EF] rounded-2xl border border-[#174D35]/14 text-xs text-[#202820] space-y-2">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-[#2F855A] shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        <strong className="text-[#174D35]">Commission &amp; 35-Day Introductory Offer:</strong>{' '}
                        Approved stores receive ₹0 platform charges for the first 35 days from store activation and ₹0 onboarding fee. Category commission or Namma Fresh payout terms are shared in writing before store activation.
                        {onOpenCommercialTerms && (
                          <>
                            {' '}
                            <button
                              type="button"
                              onClick={onOpenCommercialTerms}
                              className="text-[#174D35] font-bold underline underline-offset-2 hover:text-[#2F855A] cursor-pointer"
                            >
                              View Commercial Terms
                            </button>
                          </>
                        )}
                      </p>
                    </div>
                    <p className="text-[11px] text-[#4A5950] pl-6 leading-relaxed">
                      Customer orders are paid online and collected from your store by an authorised delivery partner with pickup OTP verification.
                    </p>
                  </div>

                  {/* Privacy Acknowledgement */}
                  <div>
                    <label
                      htmlFor="privacy_acknowledged"
                      className="flex items-start gap-3 cursor-pointer"
                    >
                      <input
                        id="privacy_acknowledged"
                        name="privacy_acknowledged"
                        type="checkbox"
                        required
                        aria-invalid={Boolean(errors.privacy_acknowledged)}
                        aria-describedby={
                          errors.privacy_acknowledged
                            ? 'privacy_acknowledged-error'
                            : undefined
                        }
                        checked={formData.privacy_acknowledged}
                        onChange={(e) =>
                          handleChange('privacy_acknowledged', e.target.checked)
                        }
                        className="mt-0.5 w-5 h-5 shrink-0 rounded border-[#174D35]/30 text-[#174D35] focus:ring-[#174D35] accent-[#174D35]"
                      />
                      <span className="text-xs text-[#4A5950] leading-snug">
                        I acknowledge the{' '}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            onOpenPrivacyNotice();
                          }}
                          className="text-[#174D35] font-bold underline underline-offset-2 hover:text-[#2F855A]"
                        >
                          Partner Privacy Notice
                        </button>{' '}
                        and understand that submitting this form expresses interest and does not automatically approve my shop.
                      </span>
                    </label>
                    {errors.privacy_acknowledged && (
                      <p
                        id="privacy_acknowledged-error"
                        role="alert"
                        className="text-xs text-rose-600 mt-1.5 font-medium"
                      >
                        {errors.privacy_acknowledged}
                      </p>
                    )}
                  </div>

                  {/* General Submission / Network Error near Submit Button */}
                  {errors.submit && (
                    <div
                      role="alert"
                      aria-live="assertive"
                      className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{errors.submit}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      aria-busy={isSubmitting}
                      className="group w-full h-13 bg-[#174D35] hover:bg-[#2F855A] disabled:bg-[#174D35]/50 disabled:cursor-not-allowed active:scale-[0.99] text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-[0_6px_20px_rgba(23,77,53,0.24)] hover:shadow-[0_8px_25px_rgba(47,133,90,0.3)] transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Submitting Application...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Application</span>
                          <Send className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Post-Submission Success Popup Modal (Only shown after backend confirms lead saved) */}
      <AnimatePresence>
        {showSuccessModal && submissionSuccess && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#0E261A]/75 backdrop-blur-xs overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowSuccessModal(false);
              }
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="seller-success-modal-title"
              aria-describedby="seller-success-modal-desc"
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-lg bg-white rounded-3xl border border-[#174D35]/20 shadow-[0_24px_64px_rgba(14,38,26,0.35)] p-5 sm:p-8 overflow-hidden my-auto"
            >
              {/* Top Brand Accent Bar */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#174D35] via-[#2F855A] to-[#FF9F43]" />

              {/* Close Icon Button (44x44px touch target) */}
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                aria-label="Close confirmation popup"
                className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 w-11 h-11 rounded-xl bg-[#FFF9EF] hover:bg-[#E5F4E8] text-[#174D35] border border-[#174D35]/12 flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#174D35]"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Success Icon & Heading */}
              <div className="flex flex-col items-center text-center pt-2">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#E5F4E8] text-[#174D35] border-2 border-[#2F855A]/35 flex items-center justify-center shadow-xs mb-3.5 sm:mb-4">
                  <CheckCircle2 className="w-8 h-8 sm:w-9 sm:h-9 text-[#2F855A]" />
                </div>

                <h3
                  id="seller-success-modal-title"
                  className="text-lg sm:text-2xl font-extrabold text-[#174D35] tracking-tight text-balance px-2"
                >
                  Application Submitted Successfully!
                </h3>

                <p
                  id="seller-success-modal-desc"
                  className="text-xs sm:text-base font-semibold text-[#202820] mt-2 leading-relaxed"
                >
                  Thank you for choosing Namma Stores. We&apos;ve received your seller partner application.
                </p>

                {submissionSuccess.lead_id && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FFF9EF] border border-[#174D35]/15 text-xs">
                    <span className="text-[#4A5950] font-semibold">Ref ID:</span>
                    <code className="font-mono font-bold text-[#174D35]">
                      {submissionSuccess.lead_id}
                    </code>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyLeadId(submissionSuccess.lead_id || '')
                      }
                      className="text-[#2F855A] hover:text-[#174D35] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedLeadId ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedLeadId ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                )}

                <p className="text-xs sm:text-sm text-[#4A5950] mt-2.5 sm:mt-3 leading-relaxed">
                  {resolvedEmailStatus === 'sent'
                    ? `Our email provider accepted your acknowledgement email for delivery to ${submittedEmail || 'your email'}. Please check your inbox or spam/promotions folder. Note that your store is currently under review and not yet live.`
                    : resolvedEmailStatus === 'skipped'
                      ? 'An application for this store was already recorded recently, so we linked this request to your existing application without sending a duplicate email.'
                      : 'Your application is safely saved in our seller database, though the automated confirmation email could not be dispatched right now. Our onboarding team has your details and will review your application within 1–2 working days.'}
                </p>
              </div>

              {/* Offer Reminder Box */}
              <div className="mt-4 sm:mt-5 p-3.5 sm:p-4 rounded-2xl bg-[#FFF9EF] border border-[#2F855A]/25 flex items-start gap-2.5 sm:gap-3 text-left">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF9F43] shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm font-semibold text-[#174D35] leading-relaxed">
                  Approved stores receive ₹0 platform charges for the first 35 days from store activation and ₹0 onboarding fee.
                </p>
              </div>

              {/* Action Buttons (Fit cleanly at 360px width with >=44px touch targets) */}
              <div className="mt-5 sm:mt-6 space-y-2.5 sm:space-y-3">
                {/* Primary Button: Join WhatsApp Seller Community */}
                <a
                  href={OFFICIAL_WHATSAPP_SELLER_COMMUNITY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackEvent('cta_click', {
                      placement: 'success_modal_whatsapp_community',
                    })
                  }
                  className="w-full min-h-[48px] px-4 sm:px-5 py-2.5 bg-[#174D35] hover:bg-[#2F855A] active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-[0_6px_18px_rgba(23,77,53,0.22)] transition-all duration-200 flex items-center justify-center gap-2 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#174D35]"
                >
                  <MessageSquare className="w-4 h-4 text-[#FF9F43] shrink-0" />
                  <span>Join WhatsApp Seller Community</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-85 shrink-0" />
                </a>

                {/* Secondary Button: Follow Us on Instagram */}
                <a
                  href={OFFICIAL_INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackEvent('cta_click', {
                      placement: 'success_modal_instagram',
                    })
                  }
                  className="w-full min-h-[48px] px-4 sm:px-5 py-2.5 bg-[#FFF9EF] hover:bg-[#E5F4E8] border border-[#174D35]/20 hover:border-[#2F855A]/45 text-[#174D35] font-extrabold text-xs sm:text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#174D35]"
                >
                  <InstagramIcon className="w-4 h-4 text-[#2F855A] shrink-0" />
                  <span>Follow Us on Instagram</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70 shrink-0" />
                </a>

                {/* Final Button: Done */}
                <button
                  type="button"
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full min-h-[44px] px-4 sm:px-5 py-2.5 bg-white hover:bg-[#FFF9EF] border border-[#174D35]/15 text-[#4A5950] hover:text-[#174D35] font-bold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#174D35]"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
