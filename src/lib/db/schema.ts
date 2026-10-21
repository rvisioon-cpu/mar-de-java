import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').default('SELLER').notNull(), // 'SUPER_ADMIN', 'ADMIN', 'SELLER'
  adminLimit: integer('admin_limit').default(0), 
  createdBy: text('created_by'), 
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

export const appointments = sqliteTable('appointments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sellerId: text('seller_id').references(() => users.id).notNull(),
  type: text('type').notNull(), // 'VIRTUAL', 'IN_PERSON'
  date: integer('date', { mode: 'timestamp' }).notNull(),
  prospectName: text('prospect_name').notNull(),
  prospectEmail: text('prospect_email'),
  prospectPhone: text('prospect_phone'),
  prospectAddress: text('prospect_address'),
  prospectId: text('prospect_id').references(() => prospects.id),
  sendEmail: integer('send_email', { mode: 'boolean' }).default(true).notNull(),
  status: text('status').default('SCHEDULED').notNull(), // 'SCHEDULED', 'COMPLETED', 'CANCELLED'
  notes: text('notes'),
  meetLink: text('meet_link'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

export const floors = sqliteTable('floors', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  level: integer('level').notNull(),
  type: text('type').default('Piso').notNull(), // 'Planta Baja', 'Piso', 'Terraza', 'Sótano', 'Azotea'
  imagePath: text('image_path'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

export const units = sqliteTable('units', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  floorId: text('floor_id').references(() => floors.id).notNull(),
  identifier: text('identifier').notNull(),
  type: text('type'),
  bedrooms: integer('bedrooms'),
  bathrooms: integer('bathrooms'),
  areaSqm: integer('area_sqm'),
  coordinates: text('coordinates', { mode: 'json' }), 
  state: text('state').default('AVAILABLE').notNull(), // 'AVAILABLE', 'RESERVED', 'SOLD', 'COMMON_AREA'
  buyerName: text('buyer_name'), 
  gallery: text('gallery', { mode: 'json' }), 
  renders: text('renders', { mode: 'json' }), 
  photosFurnished: text('photos_furnished', { mode: 'json' }),
  photosUnfurnished: text('photos_unfurnished', { mode: 'json' }),
  photosPlans: text('photos_plans', { mode: 'json' }),
  photosBalcony: text('photos_balcony', { mode: 'json' }),
  tourUrl: text('tour_url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

export const globalSettings = sqliteTable('global_settings', {
  id: text('id').primaryKey(), 
  config: text('config').notNull(), 
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const buildingFaces = sqliteTable('building_faces', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  dayBackground: text('day_background'),
  dayBackgroundVideo: text('day_background_video'),
  dayHighlight: text('day_highlight'),
  dayIntroVideo: text('day_intro_video'),
  dayToLeftTransition: text('day_to_left_transition'),
  dayToRightTransition: text('day_to_right_transition'),
  nightBackground: text('night_background'),
  nightBackgroundVideo: text('night_background_video'),
  nightHighlight: text('night_highlight'),
  nightIntroVideo: text('night_intro_video'),
  nightToLeftTransition: text('night_to_left_transition'),
  nightToRightTransition: text('night_to_right_transition'),
  dayToNightTransition: text('day_to_night_transition'),
  nightToDayTransition: text('night_to_day_transition'),
  order: integer('order').default(0).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});


export const media = sqliteTable('media', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  url: text('url').notNull(),
  urlNight: text('url_night'),
  type: text('type'),
  category: text('category').default('EXTRA').notNull(), // 'VIDEO_SIDEBAR', 'AMENITIES_GALLERY', 'EXTRA'
  isActive: integer('is_active', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

export const brochures = sqliteTable('brochures', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  url: text('url').notNull(),
  type: text('type').default('GENERAL').notNull(), // 'GENERAL' | 'UNIT'
  unitId: text('unit_id').unique(),
  isActive: integer('is_active', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

export const constructionProgress = sqliteTable('construction_progress', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  mediaUrl: text('media_url').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

export const logs = sqliteTable('logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id'),
  userName: text('user_name'),
  action: text('action').notNull(), // 'CREATE', 'UPDATE', 'DELETE'
  entityType: text('entity_type').notNull(), // 'floor', 'unit'
  entityId: text('entity_id').notNull(),
  details: text('details'), // JSON string with details of the change
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const tours = sqliteTable('tours', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  thumbnailUrl: text('thumbnail_url').notNull(),
  type: text('type').default('building').notNull(), // 'building' | 'unit'
  targetUrl: text('target_url').notNull(),
  unitId: text('unit_id').references(() => units.id).unique(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  order: integer('order').default(0).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

export const galleryCollections = sqliteTable('gallery_collections', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  coverImage: text('cover_image').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

export const locationsPoi = sqliteTable('locations_poi', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  category: text('category').notNull(),
  imagePath: text('image_path'),
  longitude: real('longitude').notNull(),
  latitude: real('latitude').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

export const prospects = sqliteTable('prospects', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  address: text('address'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

export const prospectUnits = sqliteTable('prospect_units', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  prospectId: text('prospect_id').references(() => prospects.id).notNull(),
  unitId: text('unit_id').references(() => units.id).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const availabilities = sqliteTable('availabilities', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id).notNull(),
  dayOfWeek: integer('day_of_week').notNull(), // 0 = Sunday, 1 = Monday, etc.
  startTime: text('start_time').notNull(), // e.g. "09:00"
  endTime: text('end_time').notNull(), // e.g. "17:00"
  slotDuration: integer('slot_duration').default(30).notNull(), // slot duration in minutes
  meetingType: text('meeting_type').default('BOTH').notNull(), // 'VIRTUAL', 'IN_PERSON', 'BOTH'
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const calendarTransfers = sqliteTable('calendar_transfers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  fromSellerId: text('from_seller_id').references(() => users.id).notNull(),
  toSellerId: text('to_seller_id').references(() => users.id).notNull(),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const analyticsSessions = sqliteTable('analytics_sessions', {
  id: text('id').primaryKey(),
  deviceType: text('device_type').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }).notNull(),
}, (table) => [index('analytics_sessions_created_at_idx').on(table.createdAt)]);

export const pageViews = sqliteTable('page_views', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  path: text('path').notNull(),
  sessionId: text('session_id').references(() => analyticsSessions.id),
  unitId: text('unit_id').references(() => units.id),
  deviceType: text('device_type').notNull(), // 'mobile', 'tablet', 'desktop'
  duration: integer('duration').default(0), // in seconds
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const socialContent = sqliteTable('social_content', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  platform: text('platform').notNull(), // 'facebook', 'instagram', 'tiktok', 'linkedin'
  templateType: text('template_type').notNull(), // 'post_square', 'post_horizontal', 'story', 'reel_cover'
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  aspectRatio: text('aspect_ratio').notNull(), // '1:1', '1.91:1', '9:16', '4:5'
  prompt: text('prompt'),
  resultUrl: text('result_url'),
  referenceUrls: text('reference_urls', { mode: 'json' }), // string[]
  status: text('status').default('DRAFT').notNull(), // 'DRAFT', 'GENERATING', 'COMPLETED', 'FAILED'
  createdBy: text('created_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

// Plantillas de lienzo guardadas por el usuario: conservan la medida del
// canvas y la posición/estilo de los textos; los medios se agregan al usarla
export const canvasTemplates = sqliteTable('canvas_templates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  aspectRatio: text('aspect_ratio').notNull(), // '1:1', '1.91:1', '9:16', '4:5'
  layout: text('layout', { mode: 'json' }).notNull(), // { version, texts: [{ text, color, fontSize, x, y }] }
  createdBy: text('created_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

// Una fila por imagen realmente generada con IA (los fallbacks no cuentan).
// Es la fuente del tope mensual: se cuentan las filas del mes en curso.
export const imageGenerations = sqliteTable('image_generations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  socialContentId: text('social_content_id').references(() => socialContent.id),
  engine: text('engine').notNull(), // 'openai' | 'gemini'
  createdBy: text('created_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const socialContentMessages = sqliteTable('social_content_messages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  socialContentId: text('social_content_id').references(() => socialContent.id).notNull(),
  sender: text('sender').notNull(), // 'USER', 'AI'
  text: text('text').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});



