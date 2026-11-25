import React, { useEffect, useState } from 'react';
import { fetchUserProfile, updateUserProfile } from '../services/api';
import type { ApiUserProfile, UpdateApiUserProfileInput } from '../services/api';

interface ProfileViewProps {
  token: string;
  userId: string;
  onUserUpdated: (profile: ApiUserProfile) => void;
  photoUrl?: string;
  onPhotoUpdated: (photoUrl: string) => void;
  onBack: () => void;
}

type EditableProfile = UpdateApiUserProfileInput;

const emptyProfile: EditableProfile = {
  cedula: '',
  nombre_completo: '',
  telefono: '',
  correo: ''
};

export const ProfileView: React.FC<ProfileViewProps> = ({
  token,
  userId,
  onUserUpdated,
  photoUrl,
  onPhotoUpdated,
  onBack
}) => {
  const [profile, setProfile] = useState<ApiUserProfile | null>(null);
  const [form, setForm] = useState<EditableProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setProfile(null);
    fetchUserProfile(token, userId)
      .then((userProfile) => {
        if (cancelled) return;
        setProfile(userProfile);
        setForm({
          cedula: userProfile.cedula,
          nombre_completo: userProfile.nombre_completo,
          telefono: userProfile.telefono || '',
          correo: userProfile.correo || ''
        });
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar el perfil.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, userId]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.currentTarget;
    if (name === 'cedula' || name === 'nombre_completo' || name === 'telefono' || name === 'correo') {
      setForm((current) => ({ ...current, [name]: value }));
    }
    setSuccess('');
  };

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Selecciona una imagen JPG, PNG o WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen debe pesar menos de 5 MB.');
      return;
    }

    setError('');
    setSuccess('');
    setUploadingPhoto(true);
    try {
      const photoDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('No fue posible leer la imagen.'));
        reader.onload = () => {
          if (typeof reader.result !== 'string') {
            reject(new Error('No fue posible leer la imagen.'));
            return;
          }
          const image = new Image();
          image.onerror = () => reject(new Error('El archivo seleccionado no es una imagen válida.'));
          image.onload = () => {
            const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
            const context = canvas.getContext('2d');
            if (!context) {
              reject(new Error('El navegador no pudo procesar la imagen.'));
              return;
            }
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
          };
          image.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
      onPhotoUpdated(photoDataUrl);
      setSuccess('La foto de perfil se actualizó correctamente.');
    } catch (photoError: unknown) {
      setError(photoError instanceof Error ? photoError.message : 'No fue posible actualizar la foto.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const updatedProfile = await updateUserProfile(token, userId, form);
      setProfile(updatedProfile);
      setForm({
        cedula: updatedProfile.cedula,
        nombre_completo: updatedProfile.nombre_completo,
        telefono: updatedProfile.telefono || '',
        correo: updatedProfile.correo || ''
      });
      onUserUpdated(updatedProfile);
      setEditing(false);
      setSuccess('Tus datos se actualizaron correctamente.');
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'No fue posible actualizar tus datos.');
    } finally {
      setSaving(false);
    }
  };

  const inputClassName = 'w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:bg-stone-100';

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-amber-800">Cuenta</p>
          <h2 className="text-3xl font-black text-stone-900">Perfil de usuario</h2>
        </div>
        <button type="button" onClick={onBack} className="rounded-xl border border-stone-300 px-4 py-2 font-bold text-stone-700 hover:bg-stone-100">
          Volver al inicio
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900" role="status">
          Cargando datos del perfil…
        </div>
      ) : error && !profile ? (
        <div className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800" role="alert">
          <p>{error}</p>
          <button type="button" onClick={onBack} className="font-bold underline">Volver al inicio</button>
        </div>
      ) : profile ? (
        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-5">
            {photoUrl ? (
              <img src={photoUrl} alt="Foto de perfil" className="h-24 w-24 rounded-full border-4 border-amber-200 object-cover" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-amber-200 bg-amber-100 text-4xl" aria-label="Sin foto de perfil">
                👨‍🌾
              </div>
            )}
            <div className="space-y-2">
              <p className="font-bold text-stone-800">Foto de perfil</p>
              <label className="inline-flex cursor-pointer rounded-xl border border-amber-700 px-4 py-2 font-bold text-amber-900 hover:bg-amber-50">
                {uploadingPhoto ? 'Procesando foto…' : photoUrl ? 'Cambiar foto' : 'Agregar foto'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  disabled={uploadingPhoto}
                  className="sr-only"
                  aria-label="Seleccionar foto de perfil"
                />
              </label>
              <p className="text-xs text-stone-500">JPG, PNG o WebP; máximo 5 MB.</p>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="profile-cedula" className="mb-1.5 block text-sm font-bold text-stone-700">Cédula</label>
              <input id="profile-cedula" name="cedula" value={form.cedula} onChange={handleChange} className={inputClassName} maxLength={20} required disabled={!editing || saving} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="profile-name" className="mb-1.5 block text-sm font-bold text-stone-700">Nombre completo</label>
              <input id="profile-name" name="nombre_completo" value={form.nombre_completo} onChange={handleChange} className={inputClassName} maxLength={150} required disabled={!editing || saving} />
            </div>
            <div>
              <label htmlFor="profile-phone" className="mb-1.5 block text-sm font-bold text-stone-700">Teléfono</label>
              <input id="profile-phone" name="telefono" value={form.telefono} onChange={handleChange} className={inputClassName} maxLength={20} disabled={!editing || saving} />
            </div>
            <div>
              <label htmlFor="profile-email" className="mb-1.5 block text-sm font-bold text-stone-700">Correo electrónico</label>
              <input id="profile-email" name="correo" type="email" value={form.correo} onChange={handleChange} className={inputClassName} maxLength={150} disabled={!editing || saving} />
            </div>
            <div>
              <label htmlFor="profile-role" className="mb-1.5 block text-sm font-bold text-stone-700">Rol</label>
              <input id="profile-role" className={inputClassName} value={profile.rol} disabled />
            </div>
            <div>
              <label htmlFor="profile-active" className="mb-1.5 block text-sm font-bold text-stone-700">Estado</label>
              <input id="profile-active" className={inputClassName} value={profile.activo ? 'Activo' : 'Inactivo'} disabled />
            </div>
          </div>

          {error && <p className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-800" role="alert">{error}</p>}
          {success && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800" role="status">{success}</p>}

          {!editing ? (
            <button
              type="button"
              onClick={() => {
                setError('');
                setSuccess('');
                setEditing(true);
              }}
              disabled={loading}
              className="w-full rounded-xl bg-amber-700 px-5 py-3 font-black text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              Actualizar datos
            </button>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={saving || loading} className="w-full rounded-xl bg-amber-700 px-5 py-3 font-black text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!profile) return;
                  setForm({
                    cedula: profile.cedula,
                    nombre_completo: profile.nombre_completo,
                    telefono: profile.telefono || '',
                    correo: profile.correo || ''
                  });
                  setError('');
                  setSuccess('');
                  setEditing(false);
                }}
                disabled={saving}
                className="w-full rounded-xl border border-stone-300 px-5 py-3 font-bold text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                Cancelar
              </button>
            </div>
          )}
        </form>
      ) : null}
    </section>
  );
};
