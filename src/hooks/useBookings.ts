import { useCallback, useEffect, useState } from "react"

import type { BookingWithItems, UUID } from "@/lib/types"
import {
  createBooking as libCreateBooking,
  deleteBooking as libDeleteBooking,
  getBookings,
  updateBooking as libUpdateBooking,
  type CreateBookingInput,
  type UpdateBookingInput,
} from "@/lib/bookings"

export function useBookings() {
  const [bookings, setBookings] = useState<BookingWithItems[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true
    if (!silent) setIsLoading(true)
    setError(null)
    try {
      const data = await getBookings()
      setBookings(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Tải danh sách đặt phòng thất bại")
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createBooking = useCallback(
    async (input: CreateBookingInput) => {
      await libCreateBooking(input)
      await refresh({ silent: true })
    },
    [refresh]
  )

  const updateBooking = useCallback(
    async (id: UUID, input: UpdateBookingInput) => {
      await libUpdateBooking(id, input)
      await refresh({ silent: true })
    },
    [refresh]
  )

  const deleteBooking = useCallback(
    async (id: UUID) => {
      await libDeleteBooking(id)
      await refresh({ silent: true })
    },
    [refresh]
  )

  return { bookings, isLoading, error, refresh, createBooking, updateBooking, deleteBooking }
}

export type { CreateBookingInput, UpdateBookingInput }
