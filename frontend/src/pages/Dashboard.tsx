import { useQuery } from '@tanstack/react-query'
import { Enquiry } from '../lib/types'
import { getDashboardData } from '../services/dashboard'

export function Dashboard() {
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboardData })
  return <><header className="page-header"><div><p className="eyebrow">OVERVIEW</p><h1>Dashboard</h1></div></header><div className="stat-grid">{[['Products', data?.counts[0] ?? '—'], ['Categories', data?.counts[1] ?? '—'], ['New enquiries', data?.counts[2] ?? '—']].map(([label, value]) => <div className="stat-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><section className="panel"><div className="panel-header"><h2>Latest enquiries</h2></div>{data?.enquiries.length ? <div className="table-wrap"><table><thead><tr><th>Name</th><th>Product</th><th>Status</th><th>Date</th></tr></thead><tbody>{data.enquiries.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.products?.name ?? 'General enquiry'}</td><td><span className={`status status-${item.status}`}>{item.status}</span></td><td>{new Date(item.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div> : <p className="muted">No enquiries yet.</p>}</section></>
}
