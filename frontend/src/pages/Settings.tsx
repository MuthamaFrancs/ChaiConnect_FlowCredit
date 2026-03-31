export function SettingsPage() {
  return (
    <div className="card-surface" style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Settings</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <section>
          <h3>Factory profile</h3>
          <label>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>Name</span>
            <input className="input" style={{ marginTop: 6 }} defaultValue="Kiambu Tea Factory" />
          </label>
          <label style={{ display: 'block', marginTop: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>KTDA number</span>
            <input className="input" style={{ marginTop: 6 }} defaultValue="KTDA-1044" />
          </label>
        </section>
        <section>
          <h3>M-Pesa configuration</h3>
          <label>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>Shortcode (masked)</span>
            <input className="input" style={{ marginTop: 6 }} defaultValue="600***" />
          </label>
          <label style={{ display: 'block', marginTop: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>Callback URLs</span>
            <input className="input" style={{ marginTop: 6 }} defaultValue="https://chaiconnect.co.ke/api/callbacks" />
          </label>
        </section>
        <section>
          <h3>FlowCredit</h3>
          <label>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>Max loan (KSh)</span>
            <input className="input" style={{ marginTop: 6 }} defaultValue="30000" />
          </label>
          <label style={{ display: 'block', marginTop: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>Interest % flat</span>
            <input className="input" style={{ marginTop: 6 }} defaultValue="8" />
          </label>
        </section>
        <section>
          <h3>Rates (KSh/kg)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <label>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>A</span>
              <input className="input" style={{ marginTop: 6 }} defaultValue="30" />
            </label>
            <label>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>B</span>
              <input className="input" style={{ marginTop: 6 }} defaultValue="25" />
            </label>
            <label>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>C</span>
              <input className="input" style={{ marginTop: 6 }} defaultValue="18" />
            </label>
          </div>
        </section>
      </div>
      <button className="btn btn-primary" type="button" style={{ marginTop: 16 }}>
        Save settings
      </button>
    </div>
  )
}
