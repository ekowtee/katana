import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import logo from './assets/main_logo.png'
import { toast } from 'react-toastify'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, MapPin, Clock, Info } from 'lucide-react'
import emailjs from '@emailjs/browser'

// ── LEGAL MODAL COMPONENT ──────────────────────────────────────────
const LegalModal = ({ title, content, isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="w-full max-w-2xl bg-panel-green border border-border-green max-h-[80vh] flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-border-green/20 flex justify-between items-center">
              <h3 className="text-xl font-display text-gold tracking-tight">{title}</h3>
              <button
                onClick={onClose}
                className="text-gold-muted hover:text-gold transition-colors p-2"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Container */}
            <div className="p-8 overflow-y-auto no-scrollbar modal-content">
              {content}
            </div>

            {/* Footer Overlay */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-panel-green to-transparent pointer-events-none"></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const App = () => {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isToSOpen, setIsToSOpen] = useState(false)
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    organisation: '',
    source: '',
    consent: false
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.consent) {
      toast.error('Please agree to the terms and privacy policy.')
      return
    }

    if (!supabase) {
      toast.error('Registration is temporarily unavailable. Please try again later.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('registrations')
        .insert([{
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          city: 'N/A',
          organisation: formData.organisation,
          source: formData.source,
          consent: formData.consent
        }])

      if (error) throw error

      // Send Confirmation Email
      try {
        const templateParams = {
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          organisation: formData.organisation
        }
        await emailjs.send(
          import.meta.env.VITE_EMAILJS_SERVICE_ID,
          import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
          templateParams,
          import.meta.env.VITE_EMAILJS_PUBLIC_KEY
        )
      } catch (emailError) {
        console.warn('Email confirmation failed to send:', emailError)
      }

      toast.success('Invitation accepted successfully!')
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        organisation: '',
        source: '',
        consent: false
      })
      setIsFormOpen(false)
    } catch (error) {
      if (error.code === '23505') {
        toast.error('This email is already registered for the event.')
      } else {
        toast.error(error.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-deep-green text-cream font-body overflow-x-hidden relative no-scrollbar">

      {/* LEFT PANEL: HERO CONTENT */}
      <div className="w-full md:w-1/2 min-h-screen relative flex flex-col justify-between overflow-hidden">
        {/* Cinematic Backdrop */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/70 z-10"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-deep-green via-transparent to-transparent z-10"></div>
          <img
            src="/assets/images/hero_bg.png"
            alt="Office background"
            className="w-full h-full object-cover scale-110"
          />
        </div>

        {/* Content Container */}
        <div className="relative z-20 flex-1 flex flex-col justify-between p-8 md:p-16 lg:p-24">
          <div className="space-y-12 md:space-y-16">
            {/* Top Branding */}
            <div className="flex items-center gap-6 group cursor-default">
              <motion.div
                initial={{ rotate: -10, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="w-16 h-16 md:w-20 md:h-20 relative"
              >
                <div className="absolute inset-0 bg-gold/20 rounded-full blur-xl animate-pulse"></div>
                <img src={logo} alt="Fellowship Logo" className="w-full h-full object-contain relative z-10 drop-shadow-2xl" />
              </motion.div>
            </div>

            {/* Main Hero Content */}
            <div className="max-w-xl">
              <div className="mb-8"><div className="badge-pill"><div className="dot"></div><span>Launch Event</span></div></div>
              <h1 className="text-[40px] md:text-headline-lg lg:text-headline-xl font-display mb-8 leading-[0.9] tracking-tight">
                The <span className="italic text-gold">Fellowship</span> <br />
                <span className="opacity-90">Begins.</span>
              </h1>
              <p className="text-body max-w-sm mb-12 text-white">Join us for the official launch of the D.A. Twum Jnr. Fellowship — an evening honouring a pioneer, featuring the launch of a book written in his honour, and opening a new chapter for creative talent.</p>
              <div className="space-y-4 text-white">
                <div className="detail-item"><Calendar size={14} className="icon" /><span>9th April 2026</span></div>
                <div className="detail-item"><Clock size={14} className="icon" /><span>15:30 GMT</span></div>
                <div className="detail-item"><MapPin size={14} className="icon" /><span>Labadi Beach Hotel, Accra</span></div>
              </div>
            </div>
          </div>
          <div className="mt-16 md:mt-0">
            <div className="w-12 h-[1px] bg-gold/30 mb-4"></div>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
              <p className="text-fine opacity-20 uppercase tracking-[0.2em]">Every legacy deserves its pages.</p>
              <div className="flex gap-6">
                <button onClick={() => setIsToSOpen(true)} className="text-[10px] opacity-30 hover:opacity-100 hover:text-gold transition-all uppercase tracking-widest font-medium">Terms & Conditions</button>
                <button onClick={() => setIsPrivacyOpen(true)} className="text-[10px] opacity-30 hover:opacity-100 hover:text-gold transition-all uppercase tracking-widest font-medium">Privacy Policy</button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile RSVP Trigger */}
        {isMobile && !isFormOpen && (
          <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onClick={() => setIsFormOpen(true)} className="fixed bottom-8 left-0 right-0 z-50 btn-primary shadow-2xl">
            Accept Invitation
          </motion.button>
        )}
      </div>

      {/* RIGHT PANEL: REGISTRATION */}
      <motion.div
        className={`w-full md:w-1/2 bg-panel-green min-h-screen relative z-40 flex flex-col p-6 md:p-10 lg:p-12
          ${isMobile ? (isFormOpen ? 'fixed inset-0 overflow-y-auto' : 'hidden') : 'static'}`}
        initial={isMobile ? { y: '100%' } : false}
        animate={isMobile && isFormOpen ? { y: 0 } : false}
      >
        {/* Mobile Close */}
        {isMobile && (
          <button onClick={() => setIsFormOpen(false)} className="absolute top-3 right-8 text-gold-muted hover:text-gold z-50"><X size={24} /></button>
        )}

        <div className="max-w-2xl mx-auto w-full relative pt-2">
          <div className="flex items-center justify-end gap-3 mb-5">
            <div className="flex-1 h-[1px] bg-gold opacity-10"></div>
            <p className="text-xs font-bold tracking-[0.4em] text-gold uppercase whitespace-nowrap">RSVP</p>
          </div>

          <h2 className="text-4xl md:text-5xl font-display mb-2 leading-tight">
            You're <span className="text-gold italic">invited.</span>
          </h2>
          <p className="text-[11px] opacity-40 mb-6 font-body tracking-wide">Confirm your attendance - it only takes a moment.</p>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* SECTION 1: YOUR DETAILS */}
            <div className="space-y-4">
              <div className="divider-label"><span className="text-section-label">Your Details</span></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-1.5"><label>Full Name</label><span className="text-gold text-[10px] mt-0.5">*</span></div>
                  <input name="fullName" value={formData.fullName} onChange={handleInputChange} required type="text" placeholder="Your full name" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-1.5"><label>Email Address</label><span className="text-gold text-[10px] mt-0.5">*</span></div>
                  <input name="email" value={formData.email} onChange={handleInputChange} required type="email" placeholder="you@email.com" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-1.5"><label>Phone Number</label><span className="optional opacity-40 text-[9px] mt-0.5">(Optional)</span></div>
                  <input name="phone" value={formData.phone} onChange={handleInputChange} type="tel" placeholder="+233 XX XXX XXXX" />
                  <p className="text-[8px] opacity-20 tracking-tighter">For WhatsApp event updates only.</p>
                </div>
              </div>
            </div>

            {/* SECTION 2: YOUR BACKGROUND */}
            <div className="space-y-4">
              <div className="divider-label"><span className="text-section-label">Your Background</span></div>
              <div className="space-y-2 col-span-full">
                <div className="flex items-start gap-1.5"><label>Organisation</label><span className="text-gold text-[10px] mt-0.5">*</span></div>
                <input name="organisation" value={formData.organisation} onChange={handleInputChange} required type="text" placeholder="Company, university, or agency" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center"><label>How did you hear about this event?</label></div>
                <select name="source" className='text-white' value={formData.source} onChange={handleInputChange}>
                  <option value="" disabled>Select one</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Direct Invite">Direct Invite</option>
                  <option value="Word of Mouth">Word of Mouth</option>
                  <option value="Ninani Group Website">Ninani Group Website</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* CONSENT AND SUBMIT */}
            <div className="space-y-4 pt-2">
              <label className="flex items-start gap-3 p-4 border border-border-green/20 bg-deep-green/30 cursor-pointer group">
                <input type="checkbox" checked={formData.consent} onChange={(e) => setFormData(prev => ({ ...prev, consent: e.target.checked }))} />
                <div className="space-y-2">
                  <p className="text-[11px] font-bold tracking-wide group-hover:text-gold transition-colors">
                    I agree to the <span className="underline decoration-gold/30 hover:text-gold transition-colors" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsToSOpen(true); }}>Terms of Service</span> and <span className="underline decoration-gold/30 hover:text-gold transition-colors" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsPrivacyOpen(true); }}>Privacy Policy</span>.
                  </p>

                </div>
              </label>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-px bg-border-green/20">
                <button type="submit" disabled={loading} className="btn-primary py-4 tracking-[0.3em]">
                  {loading ? 'Processing...' : 'Accept Invitation'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </motion.div>

      {/* ── MODALS ────────── */}
      <LegalModal
        title="Terms of Service"
        isOpen={isToSOpen}
        onClose={() => setIsToSOpen(false)}
        content={(
          <div className="space-y-6 text-white/70 font-body text-sm leading-relaxed">
            <section>
              <h4 className="text-gold font-display mb-2 uppercase tracking-widest text-[10px]">1. Acceptance</h4>
              <p>By registering for the D.A. Twum Jnr. Fellowship launch, you agree to these Terms of Service. This is a private event; attendance is subject to verification.</p>
            </section>
            <section>
              <h4 className="text-gold font-display mb-2 uppercase tracking-widest text-[10px]">2. Event Access</h4>
              <p>Entry is restricted to registered guests. The Fellowship reserves the right to refuse entry or remove individuals from the premises if conduct is deemed inappropriate.</p>
            </section>
            <section>
              <h4 className="text-gold font-display mb-2 uppercase tracking-widest text-[10px]">3. Intellectual Property</h4>
              <p>All branding, presentations, and creative assets showcased during the launch are the property of the Ninani Group and the D.A. Twum Jnr. Fellowship.</p>
            </section>
            <section>
              <h4 className="text-gold font-display mb-2 uppercase tracking-widest text-[10px]">4. Liability</h4>
              <p>The organisers are not liable for any personal property loss or injury sustained during the event within the venue premises.</p>
            </section>
          </div>
        )}
      />

      <LegalModal
        title="Privacy Policy"
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
        content={(
          <div className="space-y-6 text-white/70 font-body text-sm leading-relaxed">
            <section>
              <h4 className="text-gold font-display mb-2 uppercase tracking-widest text-[10px]">1. Data Collection</h4>
              <p>We collect your name, email, phone, and professional affiliation solely to manage event registration and Fellowship communications.</p>
            </section>
            <section>
              <h4 className="text-gold font-display mb-2 uppercase tracking-widest text-[10px]">2. Use of Information</h4>
              <p>Your data will be used to send event tickets, updates, and occasional information about future Fellowship Cohorts. We do not sell data to third parties.</p>
            </section>
            <section>
              <h4 className="text-gold font-display mb-2 uppercase tracking-widest text-[10px]">3. Communication</h4>
              <p>If you provided a WhatsApp number, it will be used only for critical event updates (location changes, timing) and will never be shared in public groups.</p>
            </section>
            <section>
              <h4 className="text-gold font-display mb-2 uppercase tracking-widest text-[10px]">4. Your Rights</h4>
              <p>You may request the deletion of your data at any time by contacting the Fellowship coordination team.</p>
            </section>
          </div>
        )}
      />
    </div>
  )
}

export default App
