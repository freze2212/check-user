import { useEffect, useMemo, useState } from 'react'
import './App.css'

type CheckType = 'safe' | 'agent-first' | 'agent-second' | 'agent-third' | string

type CheckResponse = {
  username: string
  loginUrl?: string
  timeUpVon?: string
  type?: CheckType
  otp?: string
}

function App() {
  const [isChecking, setIsChecking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [account, setAccount] = useState('')
  const [timeUpVon, setTimeUpVon] = useState('')
  const [errors, setErrors] = useState({ account: false, timeUpVon: false })
  const [checkResult, setCheckResult] = useState<CheckResponse | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [otpInput, setOtpInput] = useState('')
  const [otpError, setOtpError] = useState<string | null>(null)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [nextStep, setNextStep] = useState<'otp' | 'result' | null>(null)
  const [showProcessing, setShowProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)

  const normalizedType = useMemo(() => {
    const type = (checkResult?.type ?? 'safe').toLowerCase()
    // Bỏ cấp 3 ở UI: nếu backend vẫn trả agent-third thì gộp về cấp 2
    if (type === 'agent-third') return 'agent-second'
    return type
  }, [checkResult?.type])

  const isAgentType = () => normalizedType === 'agent-first' || normalizedType === 'agent-second'

  const getResultPillContent = () => {
    if (normalizedType === 'agent-first') {
      return (
        <>
          TÀI KHOẢN CỦA BẠN CHƯA CỨNG
          <br />
          DỄ BỊ NHÀ CÁI SOI. CẦN NẠP RÚT THÊM 5 LẦN
          <br />
          ĐỂ TÀI KHOẢN HOẠT ĐỘNG BÌNH THƯỜNG!
        </>
      )
    }
    if (normalizedType === 'agent-second') {
      return (
        <>
          Tài khoản này bạn cần nạp 5-10tr để kích hoạt thành công vào nhà cái chúc bạn thắng lớn ở sảnh
          game sexy
        </>
      )
    }
    return <>TÀI KHOẢN AN TOÀN</>
  }

  const buildHardcodedResult = (opts?: { otp?: string }): CheckResponse => {
    const username = account.trim() || 'demo_user'
    const t = timeUpVon.trim()

    return {
      username,
      timeUpVon: t || undefined,
      type: 'agent-first',
      otp: opts?.otp,
    }
  }

  const handleCheck = async () => {
    if (isChecking) return

    setErrors({ account: false, timeUpVon: false })
    setCheckResult(null)
    setApiError(null)
    setIsChecking(true)
    setShowResult(false)
    setShowOtpModal(false)
    setNextStep(null)
    setOtpInput('')
    setOtpError(null)
    setProgress(0)

    try {
      // BỎ CALL API: hardcode kết quả luôn ở Cấp 1 (agent-first)
      setCheckResult(buildHardcodedResult())
      // đánh dấu bước tiếp theo là hiển thị popup kết quả sau khi progress chạy xong
      setNextStep('result')
    } catch (err) {
      console.error(err)
      // Fallback: vẫn hiển thị kết quả hardcode thay vì lỗi API
      setCheckResult(buildHardcodedResult())
      setNextStep('result')
    } finally {
      // không tắt isChecking tại đây để cho thanh chạy hết 100%
    }
  }

  useEffect(() => {
    if (!isChecking) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        // cho sóng chạy dần tới 100%
        const next = Math.min(prev + 7, 100)
        if (next === 100) {
          clearInterval(interval)
        }
        return next
      })
    }, 120)

    return () => clearInterval(interval)
  }, [isChecking])

  // Khi progress đã chạy xong và API cũng đã trả về (có nextStep),
  // mới mở popup OTP hoặc popup kết quả.
  useEffect(() => {
    if (!nextStep || progress < 100) return

    setIsChecking(false)

    if (nextStep === 'otp') {
      setShowOtpModal(true)
    } else if (nextStep === 'result') {
      setShowResult(true)
    }

    setNextStep(null)
  }, [nextStep, progress])

  const handleCloseResult = () => {
    setShowResult(false)
  }

  const handleVerifyOtp = async () => {
    const trimmedOtp = otpInput.trim()

    // Không cho phép để trống OTP
    if (!trimmedOtp) {
      setOtpError('Vui lòng nhập OTP')
      return
    }

    try {
      setIsVerifyingOtp(true)
      setOtpError(null)
      setApiError(null)

      // BỎ CALL API: coi như OTP luôn hợp lệ và hiển thị kết quả hardcode Cấp 1
      setCheckResult(buildHardcodedResult({ otp: trimmedOtp }))

      // Nếu backend trả thành công thì đóng popup OTP
      // và hiển thị modal "Hệ thống đang xâm nhập..." rồi mới show kết quả
      setShowOtpModal(false)
      setShowProcessing(true)
      setProcessingProgress(0)
    } catch (err) {
      console.error(err)
      setCheckResult(buildHardcodedResult({ otp: trimmedOtp }))
      setShowOtpModal(false)
      setShowProcessing(true)
      setProcessingProgress(0)
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  // Hiệu ứng modal "Hệ thống đang xâm nhập..."
  useEffect(() => {
    if (!showProcessing) return

    setProcessingProgress(0)

    const interval = setInterval(() => {
      setProcessingProgress((prev) => {
        // cho % chạy mượt tương tự nút TIẾN HÀNH KIỂM TRA
        const next = Math.min(prev + 7, 100)
        if (next === 100) {
          clearInterval(interval)
          setTimeout(() => {
            setShowProcessing(false)
            setShowResult(true)
          }, 400)
        }
        return next
      })
    }, 120)

    return () => clearInterval(interval)
  }, [showProcessing])

  return (
    <main className="app-container">
      <img className="app-video" src="/bg-pc.png" alt="" aria-hidden />
      {/* Title Image - Top of page */}
      <div className="title-image-wrapper">
        <img
          src="/logo.png"
          alt="CHECK MÃ ĐẠI LÝ"
          className="title-image"
        />
      </div>

      <div className="app-content">
        {/* Modal Form */}
        <div className="modal">
          <div className="modal-binary-overlay" aria-hidden />
          <div className="modal-inner">
            <div className="popup-title-row modal-banner">
              <div className="popup-title-row-start">
                <img src="/three-dots.png" alt="" className="popup-dots" aria-hidden />
              </div>
              <h2 className="modal-banner-text popup-title-center">CHECK MÃ USER</h2>
              <div className="popup-title-row-end" aria-hidden="true" />
            </div>

            <div className="modal-form">
            {/* Input 1: Tài khoản */}
            <div
              className={`form-group ${errors.account ? 'form-group-error' : ''
                }`}
            >
              <div className="form-label-row">
                <label className="form-label">
                  &gt;&gt;[USER_ID]::MÃ NGƯỜI CHƠI/ID TÀI KHOẢN
                </label>
                {errors.account && (
                  <span className="input-error-text">Vui lòng nhập tài khoản</span>
                )}
              </div>
              <div className="input-wrapper">
                <input
                  type="text"
                  className={`form-input ${errors.account ? 'form-input--error' : ''
                    }`}
                  placeholder={
                    errors.account
                      ? 'Vui lòng nhập tài khoản'
                      : 'Nhập tên đăng nhập'
                  }
                  value={account}
                  onChange={(e) => {
                    const value = e.target.value
                    setAccount(value)
                    if (errors.account && value.trim() !== '') {
                      setErrors((prev) => ({ ...prev, account: false }))
                    }
                  }}
                />
                {errors.account && (
                  <span className="input-error-icon">!</span>
                )}
              </div>
            </div>

            {/* Input 2: Link đăng nhập nhà cái */}
            <div
              className={`form-group ${errors.timeUpVon ? 'form-group-error' : ''
                }`}
            >
              <div className="form-label-row">
                <label className="form-label">
                  &gt;&gt;[TIME_UPVON]::THỜI GIAN LÊN VỐN
                </label>
                {errors.timeUpVon && (
                  <span className="input-error-text">Vui lòng chọn thời gian lên vốn</span>
                )}
              </div>

              <div className="input-wrapper">
                <input
                  type="datetime-local"
                  className={`form-input ${errors.timeUpVon ? 'form-input--error' : ''}`}
                  value={timeUpVon}
                  onChange={(e) => {
                    const value = e.target.value
                    setTimeUpVon(value)
                    if (errors.timeUpVon && value.trim() !== '') {
                      setErrors((prev) => ({ ...prev, timeUpVon: false }))
                    }
                  }}
                />
                {errors.timeUpVon && <span className="input-error-icon">!</span>}
              </div>
            </div>

            <button
              className={`form-button ${isChecking ? 'form-button-checking' : ''
                }`}
              onClick={handleCheck}
              disabled={isChecking}
            >
              <span className="form-button-label">
                {isChecking
                  ? `ĐANG CHECK... ${Math.round(progress)}%`
                  : '> BẮT ĐẦU CHECK <'}
              </span>
            </button>

            <div className="social-icons">
              <a
                href="https://t.me/TONTON2026VIP"
                target="_blank"
                rel="noopener noreferrer"
                className="social-pill social-pill--telegram"
              >
                <svg
                  className="social-pill-icon"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M21.5 4.5L2.7 11.1c-1.1.4-1.1 1.1-.2 1.4l5.1 1.6 1.9 5.8c.3.8.7.9 1.4.6l2.6-1.9 5.5 4c1 .6 1.7.3 1.9-1l3.5-16.5c.3-1.6-.6-2.3-1.7-1.8zM17.7 7.3l-9.8 9.2c-.4.4-.7.5-1 .3l2.6-7.7.01-.02c.01-.01.02-.03.03-.04l10.1-6.3c.5-.3.5-.06.06.24z" />
                </svg>
                Telegram
              </a>

              <a
                href="https://www.facebook.com/profile.php?id=100079535651669"
                target="_blank"
                rel="noopener noreferrer"
                className="social-pill social-pill--facebook"
              >
                <svg
                  className="social-pill-icon"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M13.5 22v-8.3h2.8l.4-3.3h-3.3V8.5c0-.9.3-1.6 1.6-1.6H17V4.1c-.3 0-1.5-.1-2.8-.1-2.8 0-4.7 1.7-4.7 4.9v2.8H6.5v3.3H9.5V22h4z" />
                </svg>
                facebook
              </a>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* OTP Verify Modal */}
      {showOtpModal && (
        <div className="otp-overlay">
          <div className="otp-modal">
            <div className="popup-title-row">
              <div className="popup-title-row-start">
                <img src="/three-dots.png" alt="" className="popup-dots" aria-hidden />
              </div>
              <h2 className="popup-title-center">XÁC THỰC OTP</h2>
              <div className="popup-title-row-end">
                <button
                  type="button"
                  className="otp-close"
                  onClick={() => {
                    setShowOtpModal(false)
                  }}
                  aria-label="Đóng"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="otp-body">
              <p className="otp-desc">
                Vui lòng nhập mã OTP để xem kết quả kiểm tra.
              </p>
              <input
                type="text"
                className="otp-input"
                placeholder="Nhập OTP"
                value={otpInput}
                onChange={(e) => {
                  setOtpInput(e.target.value)
                  if (otpError) {
                    setOtpError(null)
                  }
                }}
              />
              {otpError && <div className="otp-error-text">{otpError}</div>}
            </div>
            <div className="otp-actions">
              <button className="otp-button otp-button-cancel" onClick={() => setShowOtpModal(false)}>
                HỦY
              </button>
              <button
                className="otp-button otp-button-confirm"
                onClick={handleVerifyOtp}
                disabled={isVerifyingOtp}
              >
                {isVerifyingOtp ? 'ĐANG XÁC NHẬN...' : 'XÁC NHẬN'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal (giữ nguyên, chỉ hiển thị sau khi xác thực OTP thành công) */}
      {showResult && (
        <div className="result-overlay" onClick={handleCloseResult}>
          <div
            className={`result-modal ${isAgentType() ? 'result-modal-danger' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <div className="popup-title-row">
              <div className="popup-title-row-start">
                <img src="/three-dots.png" alt="" className="popup-dots" aria-hidden />
              </div>
              <h2 className="popup-title-center result-modal-heading">ĐÃ CHECK XONG</h2>
              <div className="popup-title-row-end">
                <button
                  type="button"
                  className="result-close-x"
                  onClick={handleCloseResult}
                  aria-label="Đóng"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="result-icon-circle">
              <img
                src={isAgentType() ? "/danger.png" : "/done.png"}
                alt="Đã check xong"
                className="result-icon-image"
              />
            </div>

            {apiError && (
              <div className="result-error-text">{apiError}</div>
            )}

            {checkResult && !apiError && (
              <>
                <div className={`result-pill ${isAgentType() ? 'result-pill-danger' : ''}`}>
                  <span className="result-pill-text">{getResultPillContent()}</span>
                </div>
                {checkResult.otp && (
                  <div className="result-text-bottom">
                    OTP: <strong>{checkResult.otp}</strong>
                  </div>
                )}
                {isAgentType() && (
                  <div className="result-footer-text">CHÚC CÁC BẠN THÀNH CÔNG</div>
                )}
              </>
            )}

          </div>
        </div>
      )}
      {/* Processing Modal - Hệ thống đang xâm nhập */}
      {showProcessing && (
        <div className="processing-overlay">
          <div
            className="processing-modal"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <div className="popup-title-row">
              <div className="popup-title-row-start">
                <img src="/three-dots.png" alt="" className="popup-dots" aria-hidden />
              </div>
              <h2 className="popup-title-center processing-check-heading">&gt;CHECK&lt;</h2>
              <div className="popup-title-row-end" aria-hidden="true" />
            </div>
            <div className="processing-body">
              <p className="processing-warning-text">
                TRONG LÚC KIỂM TRA THÔNG TIN
                <br />
                VUI LÒNG KHÔNG THOÁT RA
              </p>
              <div className="processing-dots" aria-hidden>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className="processing-dot"
                    style={{ animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </div>
              <div className="processing-progress-block">
                <span className="processing-progress-text">
                  HỆ THỐNG ĐANG XÂM NHẬP...{Math.round(processingProgress)}%
                </span>
              </div>
              <p className="processing-footer-text">ĐỢI TRẢ KẾT QUẢ...</p>
            </div>
          </div>
        </div>
      )}

      {/* (removed) Casino Selection Modal */}
    </main>
  )
}

export default App
