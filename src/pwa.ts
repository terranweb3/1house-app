import { registerSW } from "virtual:pwa-register"

const updateSW = registerSW({
  onNeedRefresh() {
    const ok = window.confirm("Có bản cập nhật mới. Tải lại để cập nhật ngay?")
    if (ok) void updateSW(true)
  },
  onOfflineReady() {
    // App is cached for offline use.
  },
})

