'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { AlertCircle, Plus, X, Loader2 } from 'lucide-react'
import { DashboardSidebar } from '@/components/mealsaver/dashboard-sidebar'
import { UPLOAD } from '@/lib/constants'

// ─────────────────────────────────────────────────────────────
// Validation schema
// ─────────────────────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0]

const schema = z
  .object({
    title:               z.string().min(3, 'Title must be at least 3 characters').max(120),
    description:         z.string().max(1000).optional(),
    food_type:           z.enum(['veg', 'non_veg', 'vegan']),
    food_condition:      z.enum(['cooked', 'raw', 'packaged']),
    quantity_kg:         z
      .string()
      .min(1, 'Quantity is required')
      .refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Must be a positive number'),
    serves_approx:       z.string().optional(),
    preparation_date:    z.string().optional(),
    preparation_time:    z.string().optional(),
    expiry_date:         z.string().min(1, 'Expiry date is required'),
    expiry_time:         z.string().min(1, 'Expiry time is required'),
    pickup_address:      z.string().min(5, 'Address must be at least 5 characters'),
    pickup_city:         z.string().min(2, 'City is required'),
    pickup_instructions: z.string().max(500).optional(),
    contact_number:      z
      .string()
      .regex(/^[0-9]{10}$/, 'Enter 10-digit mobile number without spaces'),
  })
  .refine(
    d => {
      if (!d.expiry_date || !d.expiry_time) return false
      return new Date(`${d.expiry_date}T${d.expiry_time}`) > new Date()
    },
    { message: 'Expiry must be in the future', path: ['expiry_time'] }
  )

type FormValues = z.infer<typeof schema>

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────
const inputCls =
  'w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            value === opt.value
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border text-foreground hover:bg-secondary'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function CreateDonationPage() {
  const router = useRouter()
  const [files, setFiles]         = useState<File[]>([])
  const [previews, setPreviews]   = useState<string[]>([])
  const [submitError, setError]   = useState<string | null>(null)
  const [isSubmitting, setSubmit] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      food_type:      'veg',
      food_condition: 'cooked',
    },
  })

  function addFiles(fl: FileList | null) {
    if (!fl) return
    const remaining = UPLOAD.MAX_IMAGES_PER_DONATION - files.length
    const toAdd = Array.from(fl).slice(0, remaining)
    setFiles(prev => [...prev, ...toAdd])
    setPreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))])
  }

  function removeFile(i: number) {
    URL.revokeObjectURL(previews[i])
    setFiles(prev => prev.filter((_, j) => j !== i))
    setPreviews(prev => prev.filter((_, j) => j !== i))
  }

  async function onSubmit(values: FormValues) {
    setSubmit(true)
    setError(null)

    try {
      const expiryTime = new Date(`${values.expiry_date}T${values.expiry_time}`).toISOString()
      const preparationTime =
        values.preparation_date && values.preparation_time
          ? new Date(`${values.preparation_date}T${values.preparation_time}`).toISOString()
          : undefined

      // Derive food_category: cooked food has a short shelf life; raw/packaged lasts longer
      const food_category = values.food_condition === 'cooked' ? 'short_term' : 'long_term'

      const res = await fetch('/api/donations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:               values.title,
          description:         values.description || undefined,
          food_category,
          food_type:           values.food_type,
          food_condition:      values.food_condition,
          quantity_kg:         Number(values.quantity_kg),
          serves_approx:       values.serves_approx ? parseInt(values.serves_approx, 10) : undefined,
          preparation_time:    preparationTime,
          expiry_time:         expiryTime,
          pickup_address:      values.pickup_address,
          pickup_city:         values.pickup_city,
          pickup_instructions: values.pickup_instructions || undefined,
          contact_number:      `+91${values.contact_number}`,
        }),
      })

      const json = await res.json() as {
        data?: { id: string }
        error?: { message: string }
      }

      if (!res.ok || !json.data) {
        setError(json.error?.message ?? 'Failed to create donation. Please try again.')
        return
      }

      const donationId = json.data.id

      // Upload images in parallel after the donation is created.
      // Use allSettled so a failed upload doesn't block navigation.
      if (files.length > 0) {
        await Promise.allSettled(
          files.map(file => {
            const fd = new FormData()
            fd.append('image', file)
            return fetch(`/api/donations/${donationId}/images`, {
              method: 'POST',
              body:   fd,
            })
          })
        )
      }

      router.push('/donor/donations')
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setSubmit(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar role="donor" />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border bg-card px-8 py-5">
          <h1 className="text-lg font-bold text-foreground">Create Donation</h1>
          <p className="text-sm text-muted-foreground">
            Fill in the details of the food you want to donate.
          </p>
        </div>

        <div className="mx-auto max-w-2xl px-8 py-6">
          {/* Freshness alert */}
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-orange-500" />
            <div>
              <span className="font-semibold">Fresh cooked food should be picked up quickly.</span>{' '}
              Provide accurate details so NGOs can plan their pickup on time.
            </div>
          </div>

          {/* Submit error */}
          {submitError && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              {submitError}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Title */}
            <Field label="Food Title" required error={errors.title?.message}>
              <input
                {...register('title')}
                type="text"
                placeholder="e.g. Veg Biryani, Dal Tadka, Bread Rolls"
                className={inputCls}
              />
            </Field>

            {/* Description */}
            <Field label="Description" error={errors.description?.message}>
              <textarea
                {...register('description')}
                rows={2}
                placeholder="Any extra details about the food (optional)"
                className={inputCls + ' resize-none'}
              />
            </Field>

            {/* Food Type */}
            <Field label="Food Type" required error={errors.food_type?.message}>
              <Controller
                control={control}
                name="food_type"
                render={({ field }) => (
                  <ToggleGroup
                    options={[
                      { label: 'Veg',     value: 'veg' },
                      { label: 'Non-Veg', value: 'non_veg' },
                      { label: 'Vegan',   value: 'vegan' },
                    ]}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </Field>

            {/* Food Condition */}
            <Field label="Condition" required error={errors.food_condition?.message}>
              <Controller
                control={control}
                name="food_condition"
                render={({ field }) => (
                  <ToggleGroup
                    options={[
                      { label: 'Cooked',   value: 'cooked' },
                      { label: 'Raw',      value: 'raw' },
                      { label: 'Packaged', value: 'packaged' },
                    ]}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </Field>

            {/* Quantity */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Quantity (kg)" required error={errors.quantity_kg?.message}>
                <input
                  {...register('quantity_kg')}
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="e.g. 5"
                  className={inputCls}
                />
              </Field>
              <Field label="Serves approx." error={errors.serves_approx?.message}>
                <input
                  {...register('serves_approx')}
                  type="number"
                  min="1"
                  placeholder="e.g. 20 people"
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Times */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Preparation Time">
                <div className="flex gap-2">
                  <input
                    {...register('preparation_date')}
                    type="date"
                    min={today}
                    className={inputCls}
                  />
                  <input
                    {...register('preparation_time')}
                    type="time"
                    className={`${inputCls} w-36`}
                  />
                </div>
              </Field>
              <Field label="Expiry / Safe Usage Time" required error={errors.expiry_time?.message}>
                <div className="flex gap-2">
                  <input
                    {...register('expiry_date')}
                    type="date"
                    min={today}
                    className={inputCls}
                  />
                  <input
                    {...register('expiry_time')}
                    type="time"
                    className={`${inputCls} w-36`}
                  />
                </div>
              </Field>
            </div>

            {/* Address */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Pickup Address" required error={errors.pickup_address?.message}>
                <input
                  {...register('pickup_address')}
                  type="text"
                  placeholder="Street address, landmark"
                  className={inputCls}
                />
              </Field>
              <Field label="City" required error={errors.pickup_city?.message}>
                <input
                  {...register('pickup_city')}
                  type="text"
                  placeholder="e.g. Bengaluru"
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Instructions + Contact */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Pickup Instructions" error={errors.pickup_instructions?.message}>
                <textarea
                  {...register('pickup_instructions')}
                  rows={2}
                  placeholder="Gate code, parking info, ring bell at main gate, etc."
                  className={inputCls + ' resize-none'}
                />
              </Field>
              <Field label="Contact Number" required error={errors.contact_number?.message}>
                <div className="flex">
                  <span className="flex items-center rounded-l-lg border border-r-0 border-border bg-secondary px-3 text-sm text-muted-foreground">
                    +91
                  </span>
                  <input
                    {...register('contact_number')}
                    type="tel"
                    placeholder="9876543210"
                    maxLength={10}
                    className={inputCls + ' rounded-l-none'}
                  />
                </div>
              </Field>
            </div>

            {/* Image Upload */}
            <Field label="Photos">
              <div className="flex flex-wrap gap-3">
                {previews.map((src, i) => (
                  <div
                    key={i}
                    className="relative h-20 w-20 overflow-hidden rounded-xl border border-border bg-secondary"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                {files.length < UPLOAD.MAX_IMAGES_PER_DONATION && (
                  <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-secondary/50 text-muted-foreground hover:bg-secondary">
                    <Plus size={18} />
                    <span className="text-[10px]">Add Photo</span>
                    <input
                      type="file"
                      className="hidden"
                      accept={UPLOAD.ALLOWED_TYPES.join(',')}
                      multiple
                      onChange={e => addFiles(e.target.files)}
                    />
                  </label>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                JPG, PNG or WebP · max 5 MB each · up to {UPLOAD.MAX_IMAGES_PER_DONATION} photos
              </p>
            </Field>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={isSubmitting}
                className="flex-1 rounded-lg border border-border bg-white py-3 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 size={15} className="animate-spin" />}
                {isSubmitting ? 'Submitting…' : 'Submit Donation'}
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <span className="text-primary">✓</span>
              All donations are verified and used for social good.
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
