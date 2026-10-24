export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'interested'
  | 'onboarding'
  | 'approved'
  | 'activated'
  | 'not_proceeding';

export type ContactMethod = 'WhatsApp' | 'Phone Call';

export type BackendContactPreference = 'whatsapp' | 'phone';

export type BackendShopCategory =
  | 'grocery'
  | 'meat_fish_chicken'
  | 'fruits_vegetables'
  | 'milk_dairy'
  | 'puja_flowers'
  | 'other_multiple';

export type ReferralSourceOption =
  | 'Instagram'
  | 'Facebook'
  | 'WhatsApp Group'
  | 'Google Search'
  | 'Friends or Family'
  | 'Visited by Namma Stores Team'
  | 'Local Community'
  | 'Poster or Flyer'
  | 'Other';

export type LocationCaptureMethod =
  | 'device_geolocation'
  | 'google_maps_link'
  | 'manual_address';

export type ProgrammePreferenceOption =
  | 'stores_near_you'
  | 'namma_fresh'
  | 'need_guidance';

export interface EdgeFunctionLeadPayload {
  shop_name: string;
  owner_name: string;
  mobile: string;
  email: string;
  shop_address: string;
  google_maps_link?: string | null;
  shop_latitude?: number | null;
  shop_longitude?: number | null;
  location_accuracy_meters?: number | null;
  location_capture_method?: LocationCaptureMethod | null;
  shop_category: BackendShopCategory;
  programme_preference?: ProgrammePreferenceOption | null;
  contact_preference: BackendContactPreference;
  referral_source?: string;
  referral_source_other?: string;
  privacy_acknowledged: boolean;
  client_submission_id?: string;
  landing_page?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export interface EdgeFunctionNotificationResult {
  channel: 'email' | 'seller_email' | 'owner_email';
  status: 'sent' | 'skipped' | 'failed' | 'pending';
  delivery_stage?: 'accepted_by_provider' | 'skipped' | 'failed';
}

export interface EdgeFunctionResponse {
  ok?: boolean;
  success?: boolean;
  lead_id?: string;
  duplicate?: boolean;
  is_duplicate?: boolean;
  message?: string;
  error?: string;
  email_status?: 'sent' | 'skipped' | 'failed' | 'pending';
  owner_notification_status?: 'sent' | 'skipped' | 'failed' | 'pending';
  notifications?: EdgeFunctionNotificationResult[];
}
