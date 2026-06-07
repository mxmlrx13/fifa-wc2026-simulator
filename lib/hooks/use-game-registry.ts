'use client'

import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'wc26-my-games'

export interface GameRegistryEntry {
  code: string
  name: string
  joinedAt: number // epoch ms
}

function readRegistry(): GameRegistryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function writeRegistry(entries: GameRegistryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // storage full or unavailable — silently ignore
  }
}

export function registerGame(code: string, name: string) {
  const entries = readRegistry()
  const upperCode = code.toUpperCase()
  const existing = entries.find((e) => e.code === upperCode)
  if (existing) {
    existing.name = name
    writeRegistry(entries)
    return
  }
  entries.push({ code: upperCode, name, joinedAt: Date.now() })
  writeRegistry(entries)
}

export function removeGame(code: string) {
  const entries = readRegistry().filter((e) => e.code !== code.toUpperCase())
  writeRegistry(entries)
}

export function getRegisteredGames(): GameRegistryEntry[] {
  return readRegistry()
}

let registryVersion = 0
const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function getSnapshot() {
  return registryVersion
}

function getServerSnapshot() {
  return 0
}

/** Notify subscribers that registry changed. Call after registerGame/removeGame. */
export function notifyRegistryChange() {
  registryVersion++
  listeners.forEach((cb) => cb())
}

export function useGameRegistry() {
  // Re-render when registryVersion changes
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const games = readRegistry()

  return { games, refresh: notifyRegistryChange }
}
