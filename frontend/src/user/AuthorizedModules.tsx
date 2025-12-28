import React, { useEffect, useState } from 'react';

export default function AuthorizedModules({ userId }: { userId: string }) {
  const [modules, setModules] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/users/${userId}/modules`).then(r=>r.json()).then(j=>setModules(j)).catch(()=>setModules([]));
  }, [userId]);

  return (
    <div style={{ padding: 16 }}>
      <h3>Modules autorisés</h3>
      <ul>
        {modules.map(m => <li key={m}>{m}</li>)}
      </ul>
    </div>
  );
}
