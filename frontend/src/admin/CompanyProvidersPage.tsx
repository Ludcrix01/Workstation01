import React, { useEffect, useState } from 'react';

export default function CompanyProvidersPage({ companyId }: { companyId: string }) {
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    // Simple fetch; in real app use auth and proper endpoints
    fetch(`/admin/providers?companyId=${companyId}`)
      .then(r => r.json())
      .then(j => setAssignments(j))
      .catch(() => setAssignments([]));
  }, [companyId]);

  return (
    <div style={{ padding: 20 }}>
      <h3>Providers assignés pour l'entreprise</h3>
      <ul>
        {assignments.map(a => (
          <li key={a.id}>{a.display_name} — {a.enabled ? 'Actif' : 'Inactif'}</li>
        ))}
      </ul>
    </div>
  );
}
