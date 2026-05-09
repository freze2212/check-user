import { useEffect, useState, useCallback } from 'react'
import '../App.css'

type AdminLogItem = {
  _id: string
  username: string
  loginUrl: string
  type: string
  otp: string
  effectiveFrom: string
  effectiveTo: string
  createdAt: string
  updatedAt: string
}

type GetHistoryResponse = {
  message: string
  data: {
    items: AdminLogItem[]
    pagination?: {
      page: number
      perPage: number
      count: number
      totalPage: number
      total: number
    }
  }
}

type AdminUser = {
  _id: string
  username: string
  fullname: string
}

type AdminLoginResponse = {
  message: string
  data: {
    user: AdminUser
    accessToken: string
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) ?? ''

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('vi-VN')
}

function AdminHistory() {
  const [allItems, setAllItems] = useState<AdminLogItem[]>([]) // Lưu toàn bộ dữ liệu từ API
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTypes, setSelectedTypes] = useState<Record<string, string>>({})
  const [rowLoadingId, setRowLoadingId] = useState<string | null>(null)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)

  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // Search and pagination
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const perPage = 10

  const isAuthenticated = !!token

  // Filter items theo search query (client-side)
  const filteredItems = allItems.filter((item) => {
    if (!searchQuery.trim()) return true
    return item.username.toLowerCase().includes(searchQuery.toLowerCase().trim())
  })

  // Tính pagination từ filteredItems
  const totalPages = Math.ceil(filteredItems.length / perPage)
  const startIndex = (currentPage - 1) * perPage
  const endIndex = startIndex + perPage
  const displayedItems = filteredItems.slice(startIndex, endIndex)

  useEffect(() => {
    const savedToken = window.localStorage.getItem('ADMIN_ACCESS_TOKEN')
    const savedUser = window.localStorage.getItem('ADMIN_USER')
    if (savedToken) {
      setToken(savedToken)
    }
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser) as AdminUser
        setAdminUser(parsed)
      } catch {
        // ignore parse error
      }
    }
  }, [])

  const handleLogout = () => {
    setToken(null)
    setAdminUser(null)
    window.localStorage.removeItem('ADMIN_ACCESS_TOKEN')
    window.localStorage.removeItem('ADMIN_USER')
    setAllItems([])
    setSearchQuery('')
    setCurrentPage(1)
  }

  const handleLogin = async () => {
    if (!API_BASE_URL) return

    const username = loginUsername.trim()
    const password = loginPassword.trim()

    if (!username || !password) {
      setLoginError('Vui lòng nhập tài khoản và mật khẩu')
      return
    }

    try {
      setIsLoggingIn(true)
      setLoginError(null)

      const res = await fetch(`${API_BASE_URL}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
        }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const json = (await res.json()) as AdminLoginResponse
      const accessToken = json?.data?.accessToken
      const user = json?.data?.user

      if (!accessToken || !user) {
        throw new Error('No token in response')
      }

      setToken(accessToken)
      setAdminUser(user)
      window.localStorage.setItem('ADMIN_ACCESS_TOKEN', accessToken)
      window.localStorage.setItem('ADMIN_USER', JSON.stringify(user))

      // load history after login
      await fetchHistory(accessToken)
    } catch (err) {
      console.error(err)
      setLoginError('Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản/mật khẩu.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const fetchHistory = useCallback(async (overrideToken?: string | null) => {
    const authToken = overrideToken ?? token
    if (!API_BASE_URL || !authToken) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Load tất cả dữ liệu bằng cách gọi với perPage lớn (1000)
      // Hoặc load từng trang nếu cần
      const allData: AdminLogItem[] = []
      let currentPageNum = 1
      let hasMore = true

      while (hasMore) {
        const queryParams = new URLSearchParams({
          page: String(currentPageNum),
          perPage: '100', // Load nhiều items mỗi lần
        })

        const res = await fetch(`${API_BASE_URL}/check?${queryParams.toString()}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        })

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }

        const json = (await res.json()) as GetHistoryResponse
        const items = json?.data?.items ?? []
        
        if (items.length === 0) {
          hasMore = false
        } else {
          allData.push(...items)
          
          // Kiểm tra xem còn trang nào không
          const pagination = json?.data?.pagination
          if (pagination) {
            if (currentPageNum >= pagination.totalPage) {
              hasMore = false
            } else {
              currentPageNum++
            }
          } else {
            // Nếu không có pagination info, dừng nếu items < perPage
            if (items.length < 100) {
              hasMore = false
            } else {
              currentPageNum++
            }
          }
        }
      }

      setAllItems(allData)
    } catch (err) {
      console.error(err)
      setError('Có lỗi khi gọi API /check. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [token])

  // Fetch khi token thay đổi (lần đầu login)
  useEffect(() => {
    if (token) {
      setCurrentPage(1)
      setSearchQuery('')
      fetchHistory()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Reset page về 1 khi search thay đổi (chỉ filter client-side, không gọi API)
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const normalizeType = (type: string | undefined) => {
    const t = (type ?? 'safe').toLowerCase()
    // Bỏ cấp 3 ở UI: nếu backend vẫn trả agent-third thì gộp về cấp 2
    if (t === 'agent-third') return 'agent-second'
    return t
  }

  const handleGenerateOtp = async (item: AdminLogItem) => {
    if (!API_BASE_URL || !token) return

    const selectedType = normalizeType(selectedTypes[item._id] || item.type || 'safe')

    try {
      setRowLoadingId(item._id)
      setError(null)

      const res = await fetch(`${API_BASE_URL}/check/generate-otp/${item._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: selectedType,
        }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      // Sau khi generate OTP thành công, reload lại danh sách để lấy OTP mới nhất từ backend
      await fetchHistory()
    } catch (err) {
      console.error(err)
      setError('Có lỗi khi gọi API /check/generate-otp. Vui lòng thử lại.')
    } finally {
      setRowLoadingId(null)
    }
  }

  if (!isAuthenticated) {
    // Màn đăng nhập hiển thị TRƯỚC, chỉ sau khi đăng nhập mới thấy lịch sử
    return (
      <div className="admin-history-root">
        <img className="admin-history-video" src="/bg-pc.png" alt="" aria-hidden />
        <div className="admin-history-login-wrap">
          <div className="admin-history-login-card">
            <h1 className="admin-history-login-title">Đăng nhập Admin</h1>
            <p className="admin-history-login-desc">
              Nhập tài khoản và mật khẩu admin để truy cập trang lịch sử kiểm tra đại lý.
            </p>
            {loginError && <div className="admin-history-login-error">{loginError}</div>}
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoggingIn) {
                  e.preventDefault()
                  handleLogin()
                }
              }}
            >
              <div>
                <label className="admin-history-label" htmlFor="admin-login-user">
                  Tài khoản
                </label>
                <input
                  id="admin-login-user"
                  type="text"
                  className="admin-history-field-input"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Nhập tài khoản admin"
                />
              </div>
              <div>
                <label className="admin-history-label" htmlFor="admin-login-pass">
                  Mật khẩu
                </label>
                <input
                  id="admin-login-pass"
                  type="password"
                  className="admin-history-field-input"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                />
              </div>
              <button
                type="button"
                className="admin-history-login-btn"
                onClick={handleLogin}
                disabled={isLoggingIn}
              >
                {isLoggingIn ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Đã đăng nhập: hiển thị trang lịch sử kiểm tra
  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .admin-history-scroll {
            padding: 16px !important;
          }
          .admin-history-content {
            max-width: 100% !important;
          }
          .admin-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .admin-history-title {
            font-size: 24px !important;
          }
          .admin-history-search-section {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .admin-history-search-input {
            width: 100% !important;
            min-width: unset !important;
            font-size: 16px !important;
            padding: 10px 12px !important;
          }
          .admin-history-table {
            font-size: 14px !important;
            min-width: 800px;
          }
          .admin-history-th {
            padding: 10px 8px !important;
            font-size: 12px !important;
          }
          .admin-history-td {
            padding: 10px 8px !important;
            font-size: 13px !important;
          }
          .admin-history-pagination {
            flex-wrap: wrap !important;
            gap: 6px !important;
          }
          .admin-history-page-btn,
          .admin-history-page-num {
            min-width: 40px !important;
            min-height: 40px !important;
          }
          .admin-history-page-info {
            width: 100%;
            text-align: center;
            margin-left: 0 !important;
            margin-top: 8px;
          }
        }
      `}</style>
      <div className="admin-history-root">
        <img className="admin-history-video" src="/bg-pc.png" alt="" aria-hidden />
        <div className="admin-history-scroll">
          <div className="admin-history-content">
            <div
              className="admin-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <h1 className="admin-history-title">Lịch sử kiểm tra đại lý</h1>
              {adminUser && (
                <div className="admin-history-user-row">
                  <span className="admin-history-user-badge">
                    Admin: <strong>{adminUser.username}</strong>
                  </span>
                  <button type="button" className="admin-history-logout-btn" onClick={handleLogout}>
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>

            <div className="admin-history-search-section">
              <p className="admin-history-lead">Danh sách tài khoản đã đăng ký vào hệ thống</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tài khoản..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="admin-history-search-input"
                />
              </div>
            </div>

            {loading && <div className="admin-history-banner">Đang tải dữ liệu lịch sử...</div>}

            {isAuthenticated && error && (
              <div className="admin-history-banner admin-history-banner--error">{error}</div>
            )}

            {isAuthenticated && !loading && !error && allItems.length === 0 && (
              <div className="admin-history-banner">Chưa có bản ghi lịch sử nào.</div>
            )}

            {isAuthenticated &&
              !loading &&
              !error &&
              allItems.length > 0 &&
              filteredItems.length === 0 && (
                <div className="admin-history-banner">
                  Không tìm thấy kết quả nào với từ khóa &quot;{searchQuery}&quot;.
                </div>
              )}

            {isAuthenticated && !loading && !error && displayedItems.length > 0 && (
              <div className="admin-history-table-wrap">
                <table className="admin-history-table">
                  <thead>
                    <tr className="admin-history-thead-row">
                      <th className="admin-history-th">STT</th>
                      <th className="admin-history-th">Tài khoản</th>
                      <th className="admin-history-th">Link</th>
                      <th className="admin-history-th">Loại</th>
                      <th className="admin-history-th">OTP</th>
                      <th className="admin-history-th">Hiệu lực đến</th>
                      <th className="admin-history-th">Tạo lúc</th>
                      <th className="admin-history-th">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedItems.map((item, index) => (
                      <tr
                        key={item._id}
                        className={index % 2 === 0 ? 'admin-history-tr--even' : 'admin-history-tr--odd'}
                      >
                        <td className="admin-history-td">{(currentPage - 1) * 10 + index + 1}</td>
                        <td className="admin-history-td">{item.username}</td>
                        <td className="admin-history-td">{item.loginUrl}</td>
                        <td className="admin-history-td">
                          <select
                            className="admin-history-select"
                            value={normalizeType(selectedTypes[item._id] || item.type || 'safe')}
                            onChange={(e) =>
                              setSelectedTypes((prev) => ({
                                ...prev,
                                [item._id]: e.target.value,
                              }))
                            }
                          >
                            <option value="safe">An toàn</option>
                            <option value="agent-first">Cấp 1</option>
                            <option value="agent-second">Cấp 2</option>
                          </select>
                        </td>
                        <td className="admin-history-td">
                          {item.otp ? (
                            <span
                              role="button"
                              tabIndex={0}
                              className="admin-history-otp-chip"
                              onClick={() => {
                                navigator.clipboard?.writeText(item.otp)
                                setCopyMessage('Đã sao chép OTP vào clipboard')
                                setTimeout(() => setCopyMessage(null), 2000)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  navigator.clipboard?.writeText(item.otp)
                                  setCopyMessage('Đã sao chép OTP vào clipboard')
                                  setTimeout(() => setCopyMessage(null), 2000)
                                }
                              }}
                              title="Nhấn để sao chép OTP"
                            >
                              {item.otp}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="admin-history-td">{formatDate(item.effectiveTo)}</td>
                        <td className="admin-history-td">{formatDate(item.createdAt)}</td>
                        <td className="admin-history-td">
                          <button
                            type="button"
                            className="admin-history-btn-primary"
                            onClick={() => handleGenerateOtp(item)}
                            disabled={rowLoadingId === item._id}
                          >
                            {rowLoadingId === item._id ? 'ĐANG TẠO OTP...' : 'TẠO OTP'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {isAuthenticated && !loading && !error && totalPages > 1 && (
              <div className="admin-history-pagination">
                <button
                  type="button"
                  className="admin-history-page-btn"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Trước
                </button>

                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }

                    return (
                      <button
                        key={pageNum}
                        type="button"
                        className={
                          currentPage === pageNum
                            ? 'admin-history-page-num admin-history-page-num--active'
                            : 'admin-history-page-num'
                        }
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                <button
                  type="button"
                  className="admin-history-page-btn"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Sau
                </button>

                <span className="admin-history-page-info">
                  Trang {currentPage} / {totalPages} ({filteredItems.length} bản ghi)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      {copyMessage && <div className="admin-history-toast">{copyMessage}</div>}
    </>
  )
}

export default AdminHistory