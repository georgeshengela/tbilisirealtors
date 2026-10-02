import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, KeyRound, Loader2, Mail, Phone, Trash2, UserRound } from 'lucide-react';
import {
  Alert, Avatar, Field, Modal, PageTitle, PasswordField, PasswordStrength,
  btnDanger, btnGhost, btnPrimary, card, useToast,
} from '../../components/account/ui';
import { AuthError, useUserAuth } from '../../contexts/UserAuthContext';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useTranslation } from '../../i18n/LocaleContext';

const MIN_PASSWORD = 8;

function Section({ icon: Icon, title, hint, children, tone = 'default' }: {
  icon: typeof UserRound;
  title: string;
  hint?: string;
  children: ReactNode;
  tone?: 'default' | 'danger';
}) {
  return (
    <section className={`${card} ${tone === 'danger' ? 'border-red-200' : ''}`}>
      <div className="p-5 sm:p-6 md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-8">
        <div className="mb-5 md:mb-0">
          <div className="flex items-center gap-2.5">
            <Icon size={18} className={tone === 'danger' ? 'text-red-600' : 'text-blue-600'} />
            <h2 className={`font-bold ${tone === 'danger' ? 'text-red-700' : 'text-slate-900'}`}>{title}</h2>
          </div>
          {hint && <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">{hint}</p>}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

export default function AccountSettingsPage() {
  const { t } = useTranslation();
  const tx = (key: string, vars?: Record<string, string | number>) => t(`account.settings.${key}`, vars);
  const ax = (key: string, vars?: Record<string, string | number>) => t(`account.auth.${key}`, vars);
  const navigate = useNavigate();
  const toast = useToast();
  const { user, token, updateProfile, deleteAccount } = useUserAuth();
  const { upload, uploading, error: uploadError } = useFileUpload(token);
  const fileInput = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState({ firstName: '', lastName: '', phone: '' });
  const [profileErrors, setProfileErrors] = useState<{ firstName?: string }>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [savingPw, setSavingPw] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) setProfile({ firstName: user.firstName, lastName: user.lastName, phone: user.phone });
  }, [user]);

  const strengthLabels = useMemo(() => [0, 1, 2, 3, 4].map(i => t(`account.auth.strength.${i}`)), [t]);
  const pwLabels = { showLabel: ax('showPassword'), hideLabel: ax('hidePassword') };

  if (!user) return null;

  const dirty = profile.firstName !== user.firstName || profile.lastName !== user.lastName || profile.phone !== user.phone;

  async function choosePhoto(files: FileList | null) {
    const file = files?.[0];
    if (fileInput.current) fileInput.current.value = '';
    if (!file) return;
    setPhotoBusy(true);
    try {
      const [uploaded] = await upload([file], { purpose: 'avatar' });
      if (uploaded) {
        await updateProfile({ avatarUrl: uploaded.url });
        toast(tx('photoSaved'));
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : t('account.common.error'), 'error');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    setPhotoBusy(true);
    try {
      await updateProfile({ avatarUrl: '' });
      toast(tx('photoRemoved'));
    } catch (err) {
      toast(err instanceof Error ? err.message : t('account.common.error'), 'error');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!profile.firstName.trim()) {
      setProfileErrors({ firstName: ax('firstNameRequired') });
      return;
    }
    setProfileErrors({});
    setSavingProfile(true);
    try {
      await updateProfile({
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        phone: profile.phone.trim(),
      });
      toast(tx('saved'));
    } catch (err) {
      toast(err instanceof Error ? err.message : t('account.common.error'), 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    const errors: typeof pwErrors = {};
    if (!pw.current) errors.current = t('account.submit.required');
    if (pw.next.length < MIN_PASSWORD) errors.next = ax('passwordTooShort', { min: MIN_PASSWORD });
    else if (pw.next !== pw.confirm) errors.confirm = ax('passwordMismatch');
    setPwErrors(errors);
    if (Object.keys(errors).length) return;

    setSavingPw(true);
    try {
      await updateProfile({ password: pw.next, currentPassword: pw.current });
      setPw({ current: '', next: '', confirm: '' });
      toast(tx('passwordChanged'));
    } catch (err) {
      if (err instanceof AuthError && err.field === 'currentPassword') setPwErrors({ current: err.message });
      else if (err instanceof AuthError && err.field === 'password') setPwErrors({ next: err.message });
      else toast(err instanceof Error ? err.message : t('account.common.error'), 'error');
    } finally {
      setSavingPw(false);
    }
  }

  async function confirmDelete(event: FormEvent) {
    event.preventDefault();
    if (!deletePassword) {
      setDeleteError(t('account.submit.required'));
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount(deletePassword);
      navigate('/', { replace: true });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('account.common.error'));
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageTitle title={tx('title')} subtitle={tx('subtitle')} />

      {/* Photo */}
      <Section icon={Camera} title={tx('photo')} hint={tx('photoHint')}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="relative w-fit">
            <Avatar name={user.name} src={user.avatarUrl} size={96} />
            {(photoBusy || uploading) && (
              <span className="absolute inset-0 rounded-full bg-white/70 flex items-center justify-center">
                <Loader2 size={22} className="animate-spin text-slate-600" />
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={e => void choosePhoto(e.target.files)}
            />
            <button type="button" className={btnPrimary} disabled={photoBusy || uploading} onClick={() => fileInput.current?.click()}>
              <Camera size={16} /> {user.avatarUrl ? tx('photoChange') : tx('photoUpload')}
            </button>
            {user.avatarUrl && (
              <button type="button" className={btnGhost} disabled={photoBusy || uploading} onClick={() => void removePhoto()}>
                {tx('photoRemove')}
              </button>
            )}
          </div>
        </div>
        {uploadError && <div className="mt-4"><Alert tone="error">{uploadError}</Alert></div>}
      </Section>

      {/* Personal details */}
      <Section icon={UserRound} title={tx('personal')} hint={tx('personalHint')}>
        <form onSubmit={saveProfile} className="space-y-4" noValidate>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label={ax('firstName')}
              value={profile.firstName}
              onChange={e => { setProfile(p => ({ ...p, firstName: e.target.value })); setProfileErrors({}); }}
              autoComplete="given-name"
              maxLength={120}
              error={profileErrors.firstName}
            />
            <Field
              label={ax('lastName')}
              value={profile.lastName}
              onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))}
              autoComplete="family-name"
              maxLength={120}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label={ax('phone')}
              icon={Phone}
              type="tel"
              inputMode="tel"
              value={profile.phone}
              onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
              autoComplete="tel"
              placeholder="5XX XX XX XX"
              maxLength={50}
            />
            <Field label={ax('email')} icon={Mail} value={user.email} readOnly disabled hint={tx('emailLocked')} className="[&_input]:bg-slate-50 [&_input]:text-slate-500" />
          </div>
          <div className="flex justify-end pt-1">
            <button type="submit" className={btnPrimary} disabled={!dirty || savingProfile}>
              {savingProfile && <Loader2 size={16} className="animate-spin" />} {tx('save')}
            </button>
          </div>
        </form>
      </Section>

      {/* Password */}
      <Section icon={KeyRound} title={tx('security')} hint={tx('securityHint')}>
        <form onSubmit={savePassword} className="space-y-4" noValidate>
          <PasswordField
            {...pwLabels}
            label={tx('currentPassword')}
            value={pw.current}
            onChange={e => { setPw(p => ({ ...p, current: e.target.value })); setPwErrors(x => ({ ...x, current: undefined })); }}
            autoComplete="current-password"
            error={pwErrors.current}
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <PasswordField
                {...pwLabels}
                label={ax('newPassword')}
                value={pw.next}
                onChange={e => { setPw(p => ({ ...p, next: e.target.value })); setPwErrors(x => ({ ...x, next: undefined })); }}
                autoComplete="new-password"
                error={pwErrors.next}
              />
              <PasswordStrength password={pw.next} labels={strengthLabels} />
            </div>
            <PasswordField
              {...pwLabels}
              label={ax('confirmPassword')}
              value={pw.confirm}
              onChange={e => { setPw(p => ({ ...p, confirm: e.target.value })); setPwErrors(x => ({ ...x, confirm: undefined })); }}
              autoComplete="new-password"
              error={pwErrors.confirm}
            />
          </div>
          <div className="flex justify-end pt-1">
            <button type="submit" className={btnPrimary} disabled={savingPw || !pw.next}>
              {savingPw && <Loader2 size={16} className="animate-spin" />} {tx('changePassword')}
            </button>
          </div>
        </form>
      </Section>

      {/* Danger zone */}
      <Section icon={Trash2} title={tx('danger')} hint={tx('dangerHint')} tone="danger">
        <div className="flex md:justify-end md:h-full md:items-center">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white text-red-600 font-bold text-sm px-5 h-11 hover:bg-red-50 transition"
            onClick={() => { setDeletePassword(''); setDeleteError(''); setDeleteOpen(true); }}
          >
            <Trash2 size={16} /> {tx('deleteAccount')}
          </button>
        </div>
      </Section>

      <Modal open={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)} title={tx('deleteTitle')} closeLabel={t('account.common.close')}>
        <form onSubmit={confirmDelete} noValidate>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">{tx('deleteText')}</p>
          <PasswordField
            {...pwLabels}
            label={ax('password')}
            value={deletePassword}
            onChange={e => { setDeletePassword(e.target.value); setDeleteError(''); }}
            autoComplete="current-password"
            error={deleteError}
            autoFocus
          />
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setDeleteOpen(false)} disabled={deleting}>
              {t('account.common.cancel')}
            </button>
            <button type="submit" className={btnDanger} disabled={deleting}>
              {deleting && <Loader2 size={16} className="animate-spin" />} {tx('deleteConfirm')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
