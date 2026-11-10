/**
 * V2 admin/roles loading state — table-card skeleton matching variant-9
 * `loading-roller.html` shape (8 placeholder rows in the existing table-card
 * frame).
 */
export default function V2RolesLoading() {
  return (
    <>
      <div className="topbar">
        <div>
          <div className="breadcrumb">
            <span className="sk" style={{ width: 140, height: 11, display: 'inline-block' }} />
          </div>
          <h1>
            <span className="sk" style={{ width: 120, height: 22, display: 'inline-block' }} />
          </h1>
        </div>
      </div>
      <div className="content">
        <section className="table-card">
          <div className="table-toolbar">
            <div className="left">
              <span className="sk" style={{ width: 220, height: 28, borderRadius: 999 }} />
            </div>
            <div className="right">
              <span className="sk" style={{ width: 100, height: 28, borderRadius: 8 }} />
            </div>
          </div>
          <table className="data">
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder rows have no stable identity
                <tr key={i}>
                  <td>
                    <span className="sk" style={{ width: '60%', height: 12 }} />
                  </td>
                  <td>
                    <span className="sk" style={{ width: '90%', height: 12 }} />
                  </td>
                  <td className="num">
                    <span
                      className="sk"
                      style={{ width: 32, height: 12, display: 'inline-block' }}
                    />
                  </td>
                  <td className="num">
                    <span
                      className="sk"
                      style={{ width: 20, height: 12, display: 'inline-block' }}
                    />
                  </td>
                  <td>
                    <span className="sk" style={{ width: 50, height: 18, borderRadius: 999 }} />
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
