import React, { useEffect, useState } from 'react';

export default function ProvidersPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/admin/providers')
      .then(r => r.json())
      .then(j => setProviders(j))
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Intégrations (Super Admin)</h2>
      {loading && <div>Chargement...</div>}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Nom</th>
            <th style={{ textAlign: 'left' }}>Display</th>
            <th style={{ textAlign: 'left' }}>Actif</th>
            <th style={{ textAlign: 'left' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {providers.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.display_name}</td>
              <td>{p.enabled ? '✅' : '❌'}</td>
              <td>
                <button onClick={() => alert('Edit non-implémenté')}>Éditer</button>
                <button onClick={() => alert('Assigner non-implémenté')}>Assigner</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
