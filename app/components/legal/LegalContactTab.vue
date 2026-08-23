<script setup lang="ts">
const { t } = useI18n()

const emit = defineEmits<{
  switchToPrivacyTab: []
}>()

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
  <div class="space-y-6">
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
              @click="emit('switchToPrivacyTab')"
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
</template>
