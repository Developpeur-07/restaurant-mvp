import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Store, Mail, Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from './../lib/supabase';


export default function RegisterPage() {
  const { token } = useParams();

  const [restaurantName, setRestaurantName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!restaurantName.trim()) {
      setError("Le nom du restaurant est requis.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      // 1. Création du compte auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes('already registered')) {
          throw new Error("Un compte existe déjà avec cet email. Connectez-vous plutôt.");
        }
        throw new Error(signUpError.message);
      }

      const ownerId = signUpData?.user?.id;
      if (!ownerId) {
        throw new Error("La création du compte a échoué. Réessayez.");
      }

      // 2. Consommation du token + création du restaurant
      const { error: rpcError } = await supabase.rpc('use_restaurant_registration_token', {
        p_token: token,
        p_restaurant_name: restaurantName.trim(),
        p_owner_user_id: ownerId,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message || "Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-10 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" strokeWidth={1.5} />
          </div>
          <h1
            className="text-2xl mb-3"
            style={{ fontFamily: 'Georgia, serif', fontWeight: 'normal' }}
          >
            Compte créé
          </h1>
          <p className="text-neutral-600 mb-8 leading-relaxed">
            Votre restaurant a bien été enregistré. Vous pouvez maintenant vous connecter
            pour accéder à votre espace.
          </p>
          <Link
            to="/login"
            className="inline-block w-full py-3 rounded-2xl text-white font-medium transition"
            style={{ backgroundColor: '#1F2A44' }}
          >
            Aller à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-6 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-10 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-6">
          <Store className="w-6 h-6" strokeWidth={1.5} style={{ color: '#1F2A44' }} />
        </div>

        <h1
          className="text-2xl mb-2"
          style={{ fontFamily: 'Georgia, serif', fontWeight: 'normal' }}
        >
          Créer votre restaurant
        </h1>
        <p className="text-neutral-500 mb-8 text-sm leading-relaxed">
          Ce lien vous a été transmis directement. Renseignez vos informations pour
          activer votre espace.
        </p>

        {error && (
          <div className="flex items-start gap-3 bg-red-50 rounded-2xl p-4 mb-6">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Nom du restaurant
            </label>
            <div className="relative">
              <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" strokeWidth={1.5} />
              <input
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="Le nom de votre établissement"
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-300 transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" strokeWidth={1.5} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-300 transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" strokeWidth={1.5} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caractères minimum"
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-300 transition"
                required
                minLength={8}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" strokeWidth={1.5} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retapez le mot de passe"
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-300 transition"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl text-white font-medium transition flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: '#1F2A44' }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Création en cours...
              </>
            ) : (
              "Créer mon compte"
            )}
          </button>
        </form>

        <p className="text-center text-sm text-neutral-500 mt-6">
          Déjà un compte ?{' '}
          <Link to="/login" className="font-medium" style={{ color: '#1F2A44' }}>
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}