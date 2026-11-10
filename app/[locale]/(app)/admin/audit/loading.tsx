/**
 * V2 admin/audit loading state — table-card skeleton matching variant-9
 * `loading-audit.html` shape (12 placeholder rows in audit table-card frame).
 */
export default function V2AuditLoading() {
  return (
    <>
      <div className="topbar">
        <div>
          <div className="breadcrumb">
            <span className="sk" style={{ width: 180, height: 11 }} />
          </div>
          <h1>
            <span className="sk" style={{ width: 160, height: 22 }} />
          </h1>
        </div>
      </div>
      <div className="content">
        <section className="table-card">
          <div className="table-toolbar">
            <div className="left">
              <span className="sk" style={{ width: 320, height: 28, borderRadius: 999 }} />
            </div>
            <div className="right">
              <span className="sk" style={{ width: 110, height: 28, borderRadius: 8 }} />
            </div>
          </div>
          <table className="data">
            <tbody>
              {Array.from({ length: 12 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder rows have no stable identity
                <tr key={i}>
                  <td>
                    <span className="sk" style={{ width: 110, height: 12 }} />
                  </td>
                  <td>
                    <span className="sk" style={{ width: 120, height: 12 }} />
                  </td>
                  <td>
                    <span className="sk" style={{ width: 90, height: 12 }} />
                  </td>
                  <td>
                    <span className="sk" style={{ width: '80%', height: 12 }} />
                  </td>
                  <td>
                    <span className="sk" style={{ width: 80, height: 12 }} />
                  </td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
