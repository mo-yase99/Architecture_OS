'use client'
import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage(){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[message,setMessage]=useState(''),[loading,setLoading]=useState(false)
 async function submit(e:FormEvent){e.preventDefault();setLoading(true);setMessage('');const supabase=createClient();const {error}=await supabase.auth.signInWithPassword({email,password});if(error)setMessage(error.message);else window.location.href='/';setLoading(false)}
 return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24}}><form onSubmit={submit} style={{width:'100%',maxWidth:420,display:'grid',gap:16}}><div><small>MYOS</small><h1>Control Panel Login</h1><p>Sign in to keep your personal operating data private.</p></div><input required type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/><input required type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/><button className="primary" disabled={loading}>{loading?'Signing in…':'Sign in'}</button>{message&&<p>{message}</p>}</form></main>
}
