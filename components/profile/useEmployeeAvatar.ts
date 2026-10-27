'use client'

import {useCallback,useEffect,useState} from 'react'
import {harmonyFetch} from '@/lib/harmony-client'

const UPDATED_EVENT='harmony:avatar-updated'
type ProfileDocuments={documents:{id:string;category:string}[]}

/** Loads the current employee's latest private photo using existing authorized endpoints. */
export function useEmployeeAvatar(){
 const [avatarUrl,setAvatarUrl]=useState('')
 const refresh=useCallback(async()=>{
  try{
   const profile=await harmonyFetch<ProfileDocuments>('/api/employee/profile')
   const latest=profile.documents.find(document=>document.category==='avatar')
   if(!latest){setAvatarUrl('');return}
   const signed=await harmonyFetch<{url:string}>(`/api/employee/profile/documents?id=${encodeURIComponent(latest.id)}`)
   setAvatarUrl(signed.url)
  }catch{setAvatarUrl('')} // Includes Finance accounts without an employee identity.
 },[])
 useEffect(()=>{
  const timer=window.setTimeout(()=>{void refresh()},0)
  function updated(){void refresh()}
  function visible(){if(document.visibilityState==='visible')void refresh()}
  window.addEventListener(UPDATED_EVENT,updated)
  document.addEventListener('visibilitychange',visible)
  return()=>{window.clearTimeout(timer);window.removeEventListener(UPDATED_EVENT,updated);document.removeEventListener('visibilitychange',visible)}
 },[refresh])
 return avatarUrl
}
