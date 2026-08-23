<script setup lang="ts">
definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

type LegalTab = 'imprint' | 'privacy' | 'terms' | 'contact'

const activeTab = ref<LegalTab>('imprint')

// Read tab from query if provided (e.g. /legal?tab=contact or /legal?tab=privacy)
onMounted(() => {
  const queryTab = route.query.tab as LegalTab
  if (queryTab && ['imprint', 'privacy', 'terms', 'contact'].includes(queryTab)) {
    activeTab.value = queryTab
  }
})

function setTab(tab: LegalTab) {
  activeTab.value = tab
  router.replace({ query: { ...route.query, tab } })
}

// Contact Form State
const contactForm = reactive({
  name: '',
  email: '',
  subject: '',
  message: '',
  consent: false,
  website: '' // honeypot
})

const isSubmitting = ref(false)
const submitSuccess = ref(false)
const submitError = ref<string | null>(null)

const subjectOptions = computed(() => [
  { value: 'General Inquiry', label: t('legal.subject_general') },
  { value: 'Player Position / Rating Correction', label: t('legal.subject_data') },
  { value: 'Bug Report / Technical Issue', label: t('legal.subject_bug') },
  { value: 'Data Privacy / GDPR Request', label: t('legal.subject_privacy') },
  { value: 'Feedback / Feature Request', label: t('legal.subject_feedback') },
  { value: 'Other', label: t('legal.subject_other') }
])

async function handleSubmitContact() {
  submitError.value = null
  submitSuccess.value = false

  if (!contactForm.name || !contactForm.email || !contactForm.subject || !contactForm.message) {
    submitError.value = t('legal.contact_error_required')
    return
  }

  if (!contactForm.consent) {
    submitError.value = t('legal.contact_error_consent')
    return
  }

  isSubmitting.value = true

  try {
    const res = await $fetch<{ success: boolean, message: string }>('/api/contact', {
      method: 'POST',
      body: {
        name: contactForm.name,
        email: contactForm.email,
        subject: contactForm.subject,
        message: contactForm.message,
        consent: contactForm.consent,
        website: contactForm.website
      }
    })

    if (res.success) {
      submitSuccess.value = true
      contactForm.name = ''
      contactForm.email = ''
      contactForm.subject = ''
      contactForm.message = ''
      contactForm.consent = false
    }
  } catch (err: unknown) {
    const fetchErr = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    submitError.value = fetchErr.data?.statusMessage || fetchErr.statusMessage || fetchErr.message || t('legal.contact_error_generic')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
    <!-- Header -->
    <div class="space-y-3 text-center sm:text-left">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold uppercase tracking-wider">
        <UIcon
          name="i-lucide-shield-check"
          class="size-3.5"
        />
        <span>{{ $t('legal.badge') }}</span>
      </div>
      <h1 class="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
        {{ $t('legal.title') }}
      </h1>
      <p class="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl">
        {{ $t('legal.subtitle') }}
      </p>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex items-center gap-1.5 sm:gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl overflow-x-auto custom-scroll select-none">
      <button
        type="button"
        class="flex-1 min-w-[120px] sm:min-w-0 py-2.5 px-3.5 rounded-xl font-mono text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
        :class="activeTab === 'imprint'
          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm border border-zinc-200/80 dark:border-white/10'
          : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-white/5'"
        @click="setTab('imprint')"
      >
        <UIcon
          name="i-lucide-file-text"
          class="size-4 text-emerald-500"
        />
        <span>{{ $t('legal.tab_imprint') }}</span>
      </button>

      <button
        type="button"
        class="flex-1 min-w-[120px] sm:min-w-0 py-2.5 px-3.5 rounded-xl font-mono text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
        :class="activeTab === 'privacy'
          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm border border-zinc-200/80 dark:border-white/10'
          : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-white/5'"
        @click="setTab('privacy')"
      >
        <UIcon
          name="i-lucide-lock"
          class="size-4 text-emerald-500"
        />
        <span>{{ $t('legal.tab_privacy') }}</span>
      </button>

      <button
        type="button"
        class="flex-1 min-w-[120px] sm:min-w-0 py-2.5 px-3.5 rounded-xl font-mono text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
        :class="activeTab === 'terms'
          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm border border-zinc-200/80 dark:border-white/10'
          : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-white/5'"
        @click="setTab('terms')"
      >
        <UIcon
          name="i-lucide-scale"
          class="size-4 text-emerald-500"
        />
        <span>{{ $t('legal.tab_terms') }}</span>
      </button>

      <button
        type="button"
        class="flex-1 min-w-[120px] sm:min-w-0 py-2.5 px-3.5 rounded-xl font-mono text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
        :class="activeTab === 'contact'
          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm border border-zinc-200/80 dark:border-white/10'
          : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-white/5'"
        @click="setTab('contact')"
      >
        <UIcon
          name="i-lucide-mail"
          class="size-4 text-emerald-500"
        />
        <span>{{ $t('legal.tab_contact') }}</span>
      </button>
    </div>

    <!-- ============================================================ -->
    <!-- 1. TAB: IMPRINT / IMPRESSUM                                  -->
    <!-- ============================================================ -->
    <div
      v-if="activeTab === 'imprint'"
      class="space-y-6"
    >
      <div class="surface-card p-6 sm:p-8 space-y-6 text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
        <div>
          <h2 class="text-base font-black text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
            <UIcon
              name="i-lucide-building"
              class="size-4 text-emerald-500"
            />
            <span>{{ $t('legal.imprint_provider_title') }}</span>
          </h2>
          <div class="font-mono text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 space-y-0.5 bg-zinc-50 dark:bg-black/30 p-4 rounded-xl border border-zinc-200 dark:border-white/5">
            <p class="font-bold text-zinc-900 dark:text-white">
              Dustin Tramm
            </p>
            <p>c/o Impressumservice Dein-Impressum</p>
            <p>Stettiner Str. 41</p>
            <p>35410 Hungen</p>
            <p>Deutschland / Germany</p>
          </div>
        </div>

        <div>
          <h2 class="text-base font-black text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
            <UIcon
              name="i-lucide-mail"
              class="size-4 text-emerald-500"
            />
            <span>{{ $t('legal.imprint_contact_title') }}</span>
          </h2>
          <p class="text-zinc-700 dark:text-zinc-300">
            E-Mail: <a
              href="mailto:info@rntm.de"
              class="text-emerald-900 dark:text-emerald-300 font-bold hover:underline"
            >info@rntm.de</a>
          </p>
          <p class="text-zinc-700 dark:text-zinc-300 mt-1">
            Website: <a
              href="https://ed.rntm.de"
              class="text-emerald-900 dark:text-emerald-300 font-bold hover:underline"
            >https://ed.rntm.de</a>
          </p>
        </div>

        <div class="pt-4 border-t border-zinc-200 dark:border-white/5 space-y-3">
          <h2 class="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <UIcon
              name="i-lucide-info"
              class="size-4 text-amber-500"
            />
            <span>{{ $t('legal.disclaimer_title') }}</span>
          </h2>
          <div class="space-y-3 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
            <p>
              {{ $t('legal.disclaimer_text_1') }}
            </p>
            <p>
              {{ $t('legal.disclaimer_text_2') }}
            </p>
          </div>
        </div>

        <div class="pt-4 border-t border-zinc-200 dark:border-white/5 space-y-3">
          <h2 class="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <UIcon
              name="i-lucide-shield-alert"
              class="size-4 text-emerald-500"
            />
            <span>{{ $t('legal.liability_content_title') }}</span>
          </h2>
          <p class="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
            {{ $t('legal.liability_content_text') }}
          </p>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- 2. TAB: DATA PRIVACY / DATENSCHUTZ                          -->
    <!-- ============================================================ -->
    <div
      v-else-if="activeTab === 'privacy'"
      class="space-y-6"
    >
      <div class="surface-card p-6 sm:p-8 space-y-6 text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
        <div>
          <h2 class="text-lg font-black text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
            <UIcon
              name="i-lucide-user-check"
              class="size-5 text-emerald-500"
            />
            <span>{{ $t('legal.privacy_controller_title') }}</span>
          </h2>
          <p class="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 mb-3">
            {{ $t('legal.privacy_controller_text') }}
          </p>
          <div class="font-mono text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-black/30 p-3.5 rounded-xl border border-zinc-200 dark:border-white/5">
            <p class="font-bold text-zinc-900 dark:text-white">
              Dustin Tramm
            </p>
            <p>c/o Impressumservice Dein-Impressum</p>
            <p>Stettiner Str. 41, 35410 Hungen, Deutschland</p>
            <p>E-Mail: info@rntm.de</p>
          </div>
        </div>

        <div class="pt-4 border-t border-zinc-200 dark:border-white/5 space-y-2">
          <h3 class="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <UIcon
              name="i-lucide-hard-drive"
              class="size-4 text-emerald-500"
            />
            <span>{{ $t('legal.privacy_localstorage_title') }}</span>
          </h3>
          <p class="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
            {{ $t('legal.privacy_localstorage_text') }}
          </p>
        </div>

        <div class="pt-4 border-t border-zinc-200 dark:border-white/5 space-y-2">
          <h3 class="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <UIcon
              name="i-lucide-share-2"
              class="size-4 text-emerald-500"
            />
            <span>{{ $t('legal.privacy_sharing_title') }}</span>
          </h3>
          <p class="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
            {{ $t('legal.privacy_sharing_text') }}
          </p>
        </div>

        <div class="pt-4 border-t border-zinc-200 dark:border-white/5 space-y-2">
          <h3 class="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <UIcon
              name="i-lucide-server"
              class="size-4 text-emerald-500"
            />
            <span>{{ $t('legal.privacy_serverlogs_title') }}</span>
          </h3>
          <p class="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
            {{ $t('legal.privacy_serverlogs_text') }}
          </p>
        </div>

        <div class="pt-4 border-t border-zinc-200 dark:border-white/5 space-y-2">
          <h3 class="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <UIcon
              name="i-lucide-check-circle-2"
              class="size-4 text-emerald-500"
            />
            <span>{{ $t('legal.privacy_rights_title') }}</span>
          </h3>
          <p class="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
            {{ $t('legal.privacy_rights_text') }}
          </p>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- 3. TAB: TERMS OF SERVICE / NUTZUNGSBEDINGUNGEN              -->
    <!-- ============================================================ -->
    <div
      v-else-if="activeTab === 'terms'"
      class="space-y-6"
    >
      <div class="surface-card p-6 sm:p-8 space-y-6 text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
        <div>
          <h2 class="text-lg font-black text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
            <UIcon
              name="i-lucide-file-signature"
              class="size-5 text-emerald-500"
            />
            <span>{{ $t('legal.terms_scope_title') }}</span>
          </h2>
          <p class="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
            {{ $t('legal.terms_scope_text') }}
          </p>
        </div>

        <div class="pt-4 border-t border-zinc-200 dark:border-white/5 space-y-2">
          <h3 class="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <UIcon
              name="i-lucide-gamepad-2"
              class="size-4 text-emerald-500"
            />
            <span>{{ $t('legal.terms_gameplay_title') }}</span>
          </h3>
          <p class="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
            {{ $t('legal.terms_gameplay_text') }}
          </p>
        </div>

        <div class="pt-4 border-t border-zinc-200 dark:border-white/5 space-y-2">
          <h3 class="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <UIcon
              name="i-lucide-copyright"
              class="size-4 text-emerald-500"
            />
            <span>{{ $t('legal.terms_ip_title') }}</span>
          </h3>
          <p class="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
            {{ $t('legal.terms_ip_text') }}
          </p>
        </div>

        <div class="pt-4 border-t border-zinc-200 dark:border-white/5 space-y-2">
          <h3 class="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <UIcon
              name="i-lucide-alert-triangle"
              class="size-4 text-amber-500"
            />
            <span>{{ $t('legal.terms_liability_title') }}</span>
          </h3>
          <p class="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
            {{ $t('legal.terms_liability_text') }}
          </p>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- 4. TAB: CONTACT FORM / KONTAKTFORMULAR                       -->
    <!-- ============================================================ -->
    <div
      v-else-if="activeTab === 'contact'"
      class="space-y-6"
    >
      <div class="surface-card p-6 sm:p-8 space-y-6">
        <div>
          <h2 class="text-lg font-black text-zinc-900 dark:text-white mb-1.5 flex items-center gap-2">
            <UIcon
              name="i-lucide-message-square"
              class="size-5 text-emerald-500"
            />
            <span>{{ $t('legal.contact_title') }}</span>
          </h2>
          <p class="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            {{ $t('legal.contact_desc') }}
          </p>
        </div>

        <!-- Success Message Alert -->
        <div
          v-if="submitSuccess"
          class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-sm flex items-start gap-3"
          role="status"
        >
          <UIcon
            name="i-lucide-check-circle"
            class="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
          />
          <div>
            <p class="font-bold">
              {{ $t('legal.contact_success_title') }}
            </p>
            <p class="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
              {{ $t('legal.contact_success_msg') }}
            </p>
          </div>
        </div>

        <!-- Error Message Alert -->
        <div
          v-if="submitError"
          class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 text-sm flex items-start gap-3"
          role="alert"
        >
          <UIcon
            name="i-lucide-alert-circle"
            class="size-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5"
          />
          <div>
            <p class="font-bold">
              {{ $t('legal.contact_error_title') }}
            </p>
            <p class="text-xs text-rose-800 dark:text-rose-300 mt-0.5">
              {{ submitError }}
            </p>
          </div>
        </div>

        <!-- Form -->
        <form
          class="space-y-4"
          @submit.prevent="handleSubmitContact"
        >
          <!-- Honeypot anti-spam (hidden) -->
          <div class="hidden">
            <label for="contact-website">Website</label>
            <input
              id="contact-website"
              v-model="contactForm.website"
              type="text"
              name="website"
              tabindex="-1"
              autocomplete="off"
            >
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Name -->
            <div class="space-y-1.5">
              <label
                for="contact-name"
                class="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
              >
                {{ $t('legal.contact_name_label') }} *
              </label>
              <input
                id="contact-name"
                v-model="contactForm.name"
                type="text"
                required
                :placeholder="$t('legal.contact_name_placeholder')"
                class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans transition-all"
              >
            </div>

            <!-- Email -->
            <div class="space-y-1.5">
              <label
                for="contact-email"
                class="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
              >
                {{ $t('legal.contact_email_label') }} *
              </label>
              <input
                id="contact-email"
                v-model="contactForm.email"
                type="email"
                required
                placeholder="name@example.com"
                class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans transition-all"
              >
            </div>
          </div>

          <!-- Subject Dropdown -->
          <div class="space-y-1.5">
            <label
              for="contact-subject"
              class="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
            >
              {{ $t('legal.contact_subject_label') }} *
            </label>
            <select
              id="contact-subject"
              v-model="contactForm.subject"
              required
              class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans transition-all cursor-pointer"
            >
              <option
                value=""
                disabled
              >
                {{ $t('legal.contact_subject_placeholder') }}
              </option>
              <option
                v-for="opt in subjectOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>

          <!-- Message -->
          <div class="space-y-1.5">
            <label
              for="contact-message"
              class="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
            >
              {{ $t('legal.contact_message_label') }} *
            </label>
            <textarea
              id="contact-message"
              v-model="contactForm.message"
              rows="5"
              required
              :placeholder="$t('legal.contact_message_placeholder')"
              class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans transition-all resize-y"
            />
          </div>

          <!-- Consent Checkbox -->
          <div class="flex items-start gap-2.5 pt-1">
            <input
              id="contact-consent"
              v-model="contactForm.consent"
              type="checkbox"
              required
              class="mt-1 size-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            >
            <label
              for="contact-consent"
              class="text-xs text-zinc-600 dark:text-zinc-400 select-none cursor-pointer leading-normal"
            >
              {{ $t('legal.contact_consent_label') }}
              <button
                type="button"
                class="text-emerald-900 dark:text-emerald-300 font-bold hover:underline"
                @click="setTab('privacy')"
              >
                {{ $t('legal.tab_privacy') }}
              </button>.
            </label>
          </div>

          <!-- Submit Button -->
          <div class="pt-3">
            <button
              type="submit"
              :disabled="isSubmitting"
              class="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UIcon
                v-if="isSubmitting"
                name="i-lucide-loader-2"
                class="size-4 animate-spin"
              />
              <UIcon
                v-else
                name="i-lucide-send"
                class="size-4"
              />
              <span>{{ isSubmitting ? $t('legal.contact_sending') : $t('legal.contact_submit') }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
