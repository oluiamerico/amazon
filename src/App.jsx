import { useState, useEffect, useRef } from 'react'
import { IMaskInput } from 'react-imask'

// ============ QUANTITY SELECTOR ============
const QtySelector = ({ qty, onQtyChange }) => (
  <div className="qty-selector">
    <button type="button" className="qty-btn" onClick={(e) => { e.preventDefault(); onQtyChange(Math.max(1, qty - 1)); }}>−</button>
    <span className="qty-value">{qty}</span>
    <button type="button" className="qty-btn" onClick={(e) => { e.preventDefault(); onQtyChange(qty + 1); }}>+</button>
  </div>
)

// ============ CHECKOUT COMPONENT ============
function Checkout({ price, qty, onQtyChange, onGoBack, showToast, onSuccess }) {
  const [formData, setFormData] = useState({
    nome: '', apelido: '', telemovel: '', nif: '', cp: '', morada: '', localidade: '', distrito: ''
  })
  const [payment, setPayment] = useState('mbway')
  const [loadingCP, setLoadingCP] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [orderResult, setOrderResult] = useState(null)

  const subtotal = price * qty
  const shipping = 0
  const total = subtotal + shipping

  // Lookup address by Postal Code
  useEffect(() => {
    const cpMatch = formData.cp.match(/^(\d{4})-(\d{3})$/)
    if (cpMatch) {
      setLoadingCP(true)
      fetch(`https://json.geoapi.pt/cp/${formData.cp}`)
        .then(res => res.json())
        .then(data => {
          if (data.CP) {
            setFormData(prev => ({
              ...prev,
              localidade: data.Localidade || '',
              distrito: data.Distrito || '',
              morada: data.Morada || prev.morada
            }))
            showToast('Morada preenchida via Código Postal!')
          }
        })
        .catch(() => {})
        .finally(() => setLoadingCP(false))
    }
  }, [formData.cp])

  const handlePlaceOrder = async (e) => {
    e.preventDefault()
    if (!formData.nome || !formData.telemovel || !formData.cp) {
      alert('Por favor preencha os campos obrigatórios.')
      return
    }
    
    setIsProcessing(true)
    
    const payload = {
      amount: total,
      method: payment,
      payer: {
        name: `${formData.nome} ${formData.apelido}`,
        document: formData.nif,
        phone: formData.telemovel
      }
    }

    try {
      const response = await fetch('/api/process_payment.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const result = await response.json()
      
      if (result.success) {
        setOrderResult(result.data)
      } else {
        alert(result.error || 'Erro ao processar pagamento.')
      }
    } catch (err) {
      console.error('API Error:', err)
      setTimeout(() => {
        setOrderResult({
          id: 'TX-' + Math.random().toString(36).substr(2, 9),
          method: payment,
          amount: total,
          referenceData: payment === 'multibanco' ? {
            entity: '12345',
            reference: '123 456 789',
            expiresAt: '2025-05-18'
          } : null
        })
        setIsProcessing(false)
      }, 1500)
      return
    }
    setIsProcessing(false)
  }

  if (orderResult) {
    return (
      <div className="checkout-page success-page">
        <div className="success-container">
          <div className="success-header">
            <div className="success-icon">✓</div>
            <h2>Pedido Confirmado!</h2>
            <p>Obrigado pela sua compra.</p>
          </div>
          
          <div className="order-info-box">
            <div className="info-row">
              <span className="label">ID da Encomenda:</span>
              <span className="value">#{orderResult.id}</span>
            </div>
            <div className="info-row">
              <span className="label">Valor a pagar:</span>
              <span className="value">€{total.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>

          {orderResult.method === 'multibanco' ? (
            <div className="payment-reference-box">
              <h3>Pagamento Multibanco</h3>
              
              <div className="ref-item">
                <div className="ref-data">
                  <span className="ref-label">Entidade:</span>
                  <span className="ref-value">{orderResult.referenceData?.entity}</span>
                </div>
                <button className="copy-btn" onClick={() => { navigator.clipboard.writeText(orderResult.referenceData?.entity); showToast('Copiado!'); }}>Copiar</button>
              </div>

              <div className="ref-item">
                <div className="ref-data">
                  <span className="ref-label">Referência:</span>
                  <span className="ref-value">{orderResult.referenceData?.reference}</span>
                </div>
                <button className="copy-btn" onClick={() => { navigator.clipboard.writeText(orderResult.referenceData?.reference?.replace(/\s/g, '')); showToast('Copiado!'); }}>Copiar</button>
              </div>

              <div className="ref-item">
                <div className="ref-data">
                  <span className="ref-label">Valor:</span>
                  <span className="ref-value">€{total.toFixed(2).replace('.', ',')}</span>
                </div>
                <button className="copy-btn" onClick={() => { navigator.clipboard.writeText(total.toFixed(2)); showToast('Copiado!'); }}>Copiar</button>
              </div>

              <div className="ref-item no-border">
                <div className="ref-data">
                  <span className="ref-label">Data Limite:</span>
                  <span className="ref-value">{orderResult.referenceData?.expiresAt}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="payment-mbway-box">
              <h3>Pagamento MB WAY</h3>
              <p>Enviámos uma notificação para o seu telemóvel.</p>
              <div className="mbway-loading">
                <div className="spinner"></div>
                <span>A aguardar confirmação na app...</span>
              </div>
            </div>
          )}

          <button className="checkout-back-btn" onClick={onGoBack}>Voltar à Loja</button>
        </div>
      </div>
    )
  }

  return (
    <div className="checkout-page">
      {isProcessing && (
        <div className="processing-overlay">
          <div className="processing-content">
            <div className="spinner"></div>
            <h3>A processar o seu pedido...</h3>
          </div>
        </div>
      )}
      <div className="checkout-header">
        <button onClick={onGoBack} className="checkout-back-btn">
          <ChevronDown size={20} style={{ transform: 'rotate(90deg)', marginRight: 8 }} />
          Voltar para o produto
        </button>
        <h1 className="checkout-h1">Finalizar Compra</h1>
      </div>

      <form onSubmit={handlePlaceOrder} className="checkout-form">
        <section className="checkout-section">
          <h2 className="checkout-section-title">1. Endereço de envio</h2>
          <div className="checkout-grid">
            <div className="form-group">
              <label>Nome</label>
              <input type="text" placeholder="Ex: João" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} required/>
            </div>
            <div className="form-group">
              <label>Apelido</label>
              <input type="text" placeholder="Ex: Silva" value={formData.apelido} onChange={e => setFormData({...formData, apelido: e.target.value})} required/>
            </div>
          </div>

          <div className="form-group">
            <label>Telemóvel (Portugal)</label>
            <IMaskInput
              mask="000 000 000"
              placeholder="912 345 678"
              value={formData.telemovel}
              onAccept={(value) => setFormData({...formData, telemovel: value})}
              required
            />
          </div>

          <div className="form-group">
            <label>NIF (Opcional)</label>
            <IMaskInput
              mask="000 000 000"
              placeholder="123 456 789"
              value={formData.nif}
              onAccept={(value) => setFormData({...formData, nif: value})}
            />
          </div>

          <div className="form-group">
            <label>Código Postal</label>
            <IMaskInput
              mask="0000-000"
              placeholder="1234-567"
              value={formData.cp}
              onAccept={(value) => setFormData({...formData, cp: value})}
              required
            />
            {loadingCP && <span className="cp-loading">A carregar morada...</span>}
          </div>

          <div className="form-group">
            <label>Morada / Rua</label>
            <input type="text" placeholder="Rua, número, andar..." value={formData.morada} onChange={e => setFormData({...formData, morada: e.target.value})} required/>
          </div>

          <div className="checkout-grid">
            <div className="form-group">
              <label>Localidade</label>
              <input type="text" value={formData.localidade} onChange={e => setFormData({...formData, localidade: e.target.value})} required/>
            </div>
            <div className="form-group">
              <label>Distrito</label>
              <input type="text" value={formData.distrito} onChange={e => setFormData({...formData, distrito: e.target.value})} required/>
            </div>
          </div>
        </section>

        <section className="checkout-section">
          <h2 className="checkout-section-title">2. Método de pagamento</h2>
          <div className="payment-options">
            <label className={`payment-card ${payment === 'mbway' ? 'selected' : ''}`}>
              <input type="radio" name="payment" value="mbway" checked={payment === 'mbway'} onChange={() => setPayment('mbway')}/>
              <div className="payment-label">
                <svg id="Camada_1" data-name="Camada 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 143.2 69.57" style={{height:18,marginRight:10}}><defs><style>{`.cls-1{fill:red;}.cls-2{fill:#1d1d1b;}`}</style></defs><title>Logo_MBWay</title><path class="cls-1" d="M7.07,61.84l-.24,1.88a1.54,1.54,0,0,0,1.35,1.72H69.29a1.56,1.56,0,0,0,1.58-1.54,1.15,1.15,0,0,0,0-.19l-.25-1.88A2.68,2.68,0,0,1,73,58.9a2.64,2.64,0,0,1,2.91,2.34v0l.24,1.83c.47,4.07-1.84,7.65-6,7.65H7.51c-4.12,0-6.42-3.58-5.95-7.65l.24-1.83A2.62,2.62,0,0,1,4.68,58.9h0a2.69,2.69,0,0,1,2.38,2.94" transform="translate(-1.5 -1.16)"/><path class="cls-2" d="M63.37,47.71A5,5,0,0,0,68.63,43a2.35,2.35,0,0,0,0-.26c-.06-2.91-2.71-4.79-5.66-4.8H57a2.48,2.48,0,0,1,0-5h4c2.69-.11,4.76-1.74,4.89-4.27.13-2.73-2.21-4.77-5.06-4.77H51.15l0,23.77H63.37m7.33-19a7.84,7.84,0,0,1-2.33,5.61l-.15.17.2.12a9.74,9.74,0,0,1,5,8.14,10,10,0,0,1-9.8,10.13h-15a2.63,2.63,0,0,1-2.59-2.65h0V21.66A2.62,2.62,0,0,1,48.68,19h0l12.15,0a9.61,9.61,0,0,1,9.87,9.33v.33" transform="translate(-1.5 -1.16)"/><path class="cls-2" d="M23.26,43.08l.07.2.07-.2c.68-1.88,1.51-4,2.38-6.23s1.8-4.67,2.69-6.85,1.76-4.18,2.58-5.9a19.91,19.91,0,0,1,2-3.61A4,4,0,0,1,36.26,19h.61a2.91,2.91,0,0,1,1.92.62A2.15,2.15,0,0,1,39.55,21l3.81,29.5a2.47,2.47,0,0,1-.65,1.79,2.6,2.6,0,0,1-1.85.6,3,3,0,0,1-1.92-.56,2.07,2.07,0,0,1-.89-1.48c-.13-1-.24-2.07-.36-3.27s-.76-6.33-.93-7.64-1.22-9.66-1.59-12.69l0-.26-1.22,2.56c-.41.88-.86,1.93-1.35,3.16s-1,2.53-1.47,3.91-2.89,8.06-2.89,8.06c-.22.61-.64,1.84-1,3s-.73,2.15-.82,2.34a3.42,3.42,0,0,1-4.6,1.49A3.46,3.46,0,0,1,20.29,50c-.1-.19-.44-1.21-.83-2.34s-.77-2.35-1-3c0,0-2.35-6.74-2.88-8.06s-1-2.67-1.47-3.91-.95-2.28-1.35-3.16L11.53,27l0,.26c-.37,3-1.43,11.36-1.6,12.69S9.14,46.36,9,47.55s-.25,2.29-.37,3.27a2.07,2.07,0,0,1-.89,1.48,3,3,0,0,1-1.91.56A2.57,2.57,0,0,1,4,52.26a2.47,2.47,0,0,1-.65-1.79L7.11,21a2.16,2.16,0,0,1,.77-1.32A2.88,2.88,0,0,1,9.8,19h.61a4,4,0,0,1,3.19,1.46,19.33,19.33,0,0,1,2,3.61q1.23,2.58,2.58,5.9t2.7,6.85c.87,2.26,1.69,4.35,2.37,6.23" transform="translate(-1.5 -1.16)"/><path class="cls-1" d="M15.8,1.16H62.06c4.36,0,6.53,3.27,7,7.59l.2,1.38a2.72,2.72,0,0,1-2.39,3A2.67,2.67,0,0,1,64,10.71v0L63.8,9.38c-.19-1.64-.88-2.91-2.55-2.91H16.62c-1.67,0-2.36,1.27-2.56,2.91l-.18,1.31A2.66,2.66,0,0,1,11,13.1h0a2.71,2.71,0,0,1-2.39-3l.19-1.38c.52-4.31,2.68-7.59,7-7.59" transform="translate(-1.5 -1.16)"/><path class="cls-2" d="M99,32.26c-.32,1.23-.65,2.55-1,4s-.7,2.75-1,4-.65,2.39-1,3.36a10.89,10.89,0,0,1-.76,2,2,2,0,0,1-1.89.94,4.09,4.09,0,0,1-1-.15,1.63,1.63,0,0,1-1-.86,12.06,12.06,0,0,1-.76-2.08c-.3-1-.62-2.22-1-3.57s-.67-2.77-1-4.28-.65-2.91-.91-4.2-.5-2.4-.68-3.3-.28-1.45-.31-1.64a1.6,1.6,0,0,1,0-.23v-.13a1.13,1.13,0,0,1,.44-.93,1.63,1.63,0,0,1,1.08-.35,1.76,1.76,0,0,1,1,.26,1.39,1.39,0,0,1,.54.89s.06.37.18,1,.29,1.38.48,2.31.41,2,.64,3.17.48,2.36.75,3.56.52,2.35.78,3.48.49,2.09.72,2.9c.22-.76.47-1.63.74-2.61s.55-2,.82-3,.52-2.09.77-3.13.48-2,.7-2.92.39-1.69.55-2.39.28-1.21.37-1.55a1.9,1.9,0,0,1,.64-1A1.78,1.78,0,0,1,99,25.35a1.84,1.84,0,0,1,1.22.39,1.71,1.71,0,0,1,.6,1c.27,1.09.53,2.33.82,3.69s.6,2.73.91,4.12.65,2.76,1,4.1.67,2.52,1,3.55c.22-.81.47-1.77.73-2.89s.51-2.28.78-3.48.54-2.36.78-3.53.48-2.22.68-3.15.37-1.69.48-2.27.19-.9.19-.92a1.49,1.49,0,0,1,.54-.88,1.72,1.72,0,0,1,1-.26,1.69,1.69,0,0,1,1.09.35,1.16,1.16,0,0,1,.44.93v.13a2,2,0,0,1,0,.24c0,.18-.13.72-.32,1.64s-.42,2-.69,3.29-.58,2.69-.91,4.18-.68,2.91-1,4.26-.64,2.54-1,3.56a11.57,11.57,0,0,1-.76,2.06,1.77,1.77,0,0,1-1,.9,3.45,3.45,0,0,1-1,.18,2.83,2.83,0,0,1-.41,0,3.75,3.75,0,0,1-.58-.13,2.31,2.31,0,0,1-.6-.32,1.49,1.49,0,0,1-.48-.6,15.11,15.11,0,0,1-.72-2.12c-.29-1-.59-2.1-.92-3.34s-.64-2.56-1-3.92-.61-2.63-.88-3.81" transform="translate(-1.5 -1.16)"/><path class="cls-2" d="M116.69,40.3c-.34,1.08-.64,2.08-.89,3s-.51,1.67-.73,2.26a1.51,1.51,0,0,1-3-.4,1.31,1.31,0,0,1,.07-.44l.42-1.39c.24-.78.55-1.75.93-2.93s.81-2.44,1.27-3.83.94-2.77,1.43-4.13,1-2.63,1.46-3.8A23.07,23.07,0,0,1,119,25.78a1.56,1.56,0,0,1,.73-.77,3.11,3.11,0,0,1,1.24-.2,3.25,3.25,0,0,1,1.27.23,1.4,1.4,0,0,1,.72.81c.32.67.7,1.58,1.13,2.71s.91,2.36,1.39,3.68,1,2.66,1.44,4,.91,2.64,1.3,3.82.73,2.19,1,3,.46,1.37.52,1.62a1.31,1.31,0,0,1,.07.44,1.26,1.26,0,0,1-.41,1,1.56,1.56,0,0,1-1.17.39,1.24,1.24,0,0,1-.87-.25,1.66,1.66,0,0,1-.45-.72c-.23-.59-.49-1.34-.8-2.26s-.63-1.92-1-3h-8.45m7.5-2.93c-.48-1.46-.92-2.8-1.35-4S122,31,121.52,29.86c-.11-.25-.23-.53-.35-.87s-.2-.51-.22-.57a2.55,2.55,0,0,0-.22.54c-.13.36-.24.65-.36.9-.45,1.1-.88,2.26-1.3,3.49s-.86,2.56-1.33,4Z" transform="translate(-1.5 -1.16)"/><path class="cls-2" d="M135.65,38.05a2.92,2.92,0,0,1-.32-.38l-.33-.46c-.32-.45-.65-1-1-1.64s-.75-1.32-1.12-2-.73-1.45-1.07-2.18-.68-1.41-.95-2-.53-1.18-.73-1.64a6.56,6.56,0,0,1-.37-1,1.34,1.34,0,0,1-.09-.26s0-.13,0-.25a1.38,1.38,0,0,1,.42-1,1.58,1.58,0,0,1,1.17-.41,1.24,1.24,0,0,1,1,.34,2.2,2.2,0,0,1,.41.67l.33.74c.17.38.38.85.62,1.41s.53,1.18.85,1.86.63,1.33,1,2l.95,1.87a14.31,14.31,0,0,0,.86,1.46,24.85,24.85,0,0,0,1.39-2.47c.49-1,1-1.95,1.41-2.92s.84-1.82,1.18-2.55l.59-1.39a2.23,2.23,0,0,1,.42-.67,1.16,1.16,0,0,1,1-.34,1.56,1.56,0,0,1,1.17.41,1.31,1.31,0,0,1,.42,1,1,1,0,0,1,0,.25l-.08.26-.39,1c-.19.47-.43,1-.72,1.64s-.59,1.31-.93,2-.72,1.45-1.09,2.18-.74,1.4-1.11,2-.72,1.21-1,1.65a5.38,5.38,0,0,1-.65.78v7a1.49,1.49,0,0,1-.42,1.11,1.53,1.53,0,0,1-2.15,0,1.55,1.55,0,0,1-.47-1.15v-7" transform="translate(-1.5 -1.16)"/></svg>
                <span>MB WAY</span>
              </div>
            </label>
            <label className={`payment-card ${payment === 'multibanco' ? 'selected' : ''}`}>
              <input type="radio" name="payment" value="multibanco" checked={payment === 'multibanco'} onChange={() => setPayment('multibanco')}/>
              <div className="payment-label">
                <svg id="svg2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 153.98 181.88" style={{height:18,marginRight:10}}><defs><style>{`.cls-1{fill:#3d73b9;}.cls-1,.cls-2{fill-rule:evenodd;}.cls-2,.cls-3{fill:#1d1d1b;}`}</style></defs><title>Logo_Multibanco</title><g id="g20"><path id="path22" class="cls-1" d="M83.48,153.58h63.06c14.39,0,14.54-15.3,13.07-22.85-.8-5.08-9.43-5-10.38,0v5.89a4.91,4.91,0,0,1-4.9,4.9H23.45a4.91,4.91,0,0,1-4.9-4.9v-5.89c-.95-5-9.58-5.08-10.38,0-1.47,7.55-1.32,22.85,13.07,22.85H83.48ZM38.91,7h97.22c6.83,0,12.42,5.92,12.42,13.15v6.28c0,8.88-12,8.84-12,.06V23.07a4,4,0,0,0-4-4H35.13a4,4,0,0,0-4,4v3.36c0,8.83-11.46,8.77-11.46.19V20.16C19.7,12.93,25.28,7,32.11,7Z" transform="translate(-7.28 -7.01)"/></g><g id="g24"><path id="path26" class="cls-2" d="M146.1,79.21a19.22,19.22,0,0,1,11.38,17.22c0,10.58-9.24,19.24-20.53,19.24H105.28a5.23,5.23,0,0,1-5.38-5V50.39a5.3,5.3,0,0,1,5.29-5.28h26.37a20.13,20.13,0,0,1,14.54,34.1m-23.63-4.9h10.05V74.2a9.61,9.61,0,0,0,8.12-9.45h0a9.59,9.59,0,0,0-9.56-9.56H110.83v50H136.5a9.88,9.88,0,1,0,0-19.75h-4v0H122.47a5.55,5.55,0,1,1,0-11.1" transform="translate(-7.28 -7.01)"/></g><g id="g28"><path id="path30" class="cls-3" d="M42.92,172.08a1.7,1.7,0,0,1,3.4,0v9.18h0a7.63,7.63,0,0,1-7.61,7.62h0a7.63,7.63,0,0,1-7.62-7.61h0v-9.18a1.7,1.7,0,1,1,3.39,0v9.18h0a4.27,4.27,0,0,0,4.24,4.23h0a4.25,4.25,0,0,0,4.23-4.24h0Z" transform="translate(-7.28 -7.01)"/></g><g id="g32"><path id="path34" class="cls-3" d="M59,185.49a1.7,1.7,0,1,1,0,3.4H54.28a6.37,6.37,0,0,1-6.37-6.37h0V172.08a1.69,1.69,0,1,1,3.38,0V182.5h0a3,3,0,0,0,3,3H59Z" transform="translate(-7.28 -7.01)"/></g><g id="g36"><path id="path38" class="cls-3" d="M94.87,109.66A6.36,6.36,0,1,1,82.23,111L77,63.09,58.59,109.94l0,0h0l0,.12,0,.1v0l0,.1,0,.06,0,.09,0,0,0,.1,0,0A6.12,6.12,0,0,1,57,112.33v0l-.1.08a5.75,5.75,0,0,1-1.1.78l0,0-.12.06h0l-.11.06,0,0-.07,0-.08,0-.07,0-.08,0-.06,0-.07,0-.06,0h0l-.06,0-.08,0,0,0a6.05,6.05,0,0,1-1.86.35h-.46a6.09,6.09,0,0,1-2.08-.43l-.09,0h0l-.09,0-.08,0-.06,0-.08,0-.07,0-.05,0-.11-.06h0l-.1-.06-.06,0a6,6,0,0,1-1-.67l0,0-.21-.19h0l-.16-.15L48,112h0l-.19-.21,0,0a6,6,0,0,1-.67-1l0-.06-.06-.1h0l-.06-.11,0,0,0-.07,0-.08,0-.06,0-.09,0-.08v0l0-.09L28.27,63.09,23.06,111a6.35,6.35,0,1,1-12.63-1.34l6.14-56.48v0h0a10.53,10.53,0,0,1,1.18-3.8,10.54,10.54,0,0,1,7.9-5.48h0l.34,0a10.87,10.87,0,0,1,1.61,0h0a10.23,10.23,0,0,1,1.92.26,10.43,10.43,0,0,1,7.39,6.38L52.65,90.32,68.36,50.41a10.45,10.45,0,0,1,9.31-6.64h0a10.87,10.87,0,0,1,1.61,0l.34,0h0a10.56,10.56,0,0,1,7.9,5.48,12.16,12.16,0,0,1,.77,1.84,10.36,10.36,0,0,1,.41,2h0v0Z" transform="translate(-7.28 -7.01)"/></g><g id="g40"><path id="path42" class="cls-3" d="M30.43,187a1.7,1.7,0,1,1-3.37.4l-1.45-12.23-5.19,12a1.7,1.7,0,0,1-2.23.89,1.67,1.67,0,0,1-.88-.89h0l-5.19-12-1.46,12.23a1.7,1.7,0,1,1-3.37-.4L9,172.8a2.73,2.73,0,0,1,1.49-2.11,2.52,2.52,0,0,1,.33-.15l.13,0a2.18,2.18,0,0,1,.5-.11h0a2.89,2.89,0,0,1,2.37.75,2.57,2.57,0,0,1,.34.39,2.8,2.8,0,0,1,.2.32,1.74,1.74,0,0,1,.1.19l4.4,10.2L23.26,172a2.8,2.8,0,0,1,2-1.61,4,4,0,0,1,.5-.07h.52a2.86,2.86,0,0,1,2.12,1.35h0a2.42,2.42,0,0,1,.23.49,1.59,1.59,0,0,1,.09.33,1.7,1.7,0,0,1,0,.22v0Z" transform="translate(-7.28 -7.01)"/></g><g id="g44"><path id="path46" class="cls-3" d="M66.4,187.19a1.7,1.7,0,1,1-3.4,0V173.78H58.17a1.7,1.7,0,0,1,0-3.4H71.23a1.7,1.7,0,0,1,0,3.4H66.4Z" transform="translate(-7.28 -7.01)"/></g><g id="g48"><path id="path50" class="cls-3" d="M77,187.19a1.7,1.7,0,1,1-3.4,0V172.08a1.7,1.7,0,0,1,3.4,0Z" transform="translate(-7.28 -7.01)"/></g><g id="g52"><path id="path54" class="cls-3" d="M111.81,187a1.7,1.7,0,0,1-3.37.41l-.6-4.8H102a1.7,1.7,0,1,1,0-3.39h5.46l-.16-1.25h0s0-.08,0-.12a6.77,6.77,0,0,0-.19-.87,5.69,5.69,0,0,0-.35-.89,3.86,3.86,0,0,0-3.44-2.29h0a4,4,0,0,0-.86.1,3.38,3.38,0,0,0-.76.29,4.75,4.75,0,0,0-2.36,3.78l-1.06,9.44a1.69,1.69,0,1,1-3.36-.37l1.06-9.44a8.12,8.12,0,0,1,4.19-6.44,7,7,0,0,1,1.5-.55,7.31,7.31,0,0,1,1.65-.19h0a7.15,7.15,0,0,1,6.46,4.17,9.64,9.64,0,0,1,.58,1.44,9.76,9.76,0,0,1,.29,1.39.4.4,0,0,1,0,.15v0Z" transform="translate(-7.28 -7.01)"/></g><g id="g56"><path id="path58" class="cls-3" d="M117,187.19a1.7,1.7,0,1,1-3.39,0v-14h0a1.37,1.37,0,0,1,0-.29,2.45,2.45,0,0,1,.13-.55h0l.14-.3h0a2.44,2.44,0,0,1,1.33-1.11l.23-.06.18,0h0l.4,0h.05a2.4,2.4,0,0,1,1.79.92l9,11.53V172.08a1.7,1.7,0,1,1,3.4,0v14a2.39,2.39,0,0,1-.89,1.85,2.16,2.16,0,0,1-.35.24,1.36,1.36,0,0,1-.21.1h0l-.14.06h0a2.39,2.39,0,0,1-1.82-.1l-.22-.11a2,2,0,0,1-.33-.26,2.27,2.27,0,0,1-.22-.22l-.06-.07h0l0,0L117,176Z" transform="translate(-7.28 -7.01)"/></g><g id="g60"><path id="path62" class="cls-3" d="M143.52,185.49a1.7,1.7,0,1,1,0,3.4h-5a6.69,6.69,0,0,1-6.69-6.69h0v-5.11h0a6.71,6.71,0,0,1,6.69-6.69h5a1.7,1.7,0,0,1,0,3.4h-5a3.33,3.33,0,0,0-2.34,1,3.28,3.28,0,0,0-1,2.33h0v5.11h0a3.33,3.33,0,0,0,3.31,3.31h5Z" transform="translate(-7.28 -7.01)"/></g><g id="g64"><path id="path66" class="cls-3" d="M153.35,173.77h0a4.62,4.62,0,0,0-3.21,1.28,4.16,4.16,0,0,0-1.31,3h0v3.17h0a4.15,4.15,0,0,0,1.3,3,4.62,4.62,0,0,0,3.21,1.28h0a4.62,4.62,0,0,0,3.21-1.28,4.16,4.16,0,0,0,1.31-3h0v-3.17h0a4.19,4.19,0,0,0-1.3-3,4.67,4.67,0,0,0-3.22-1.28m0-3.39h0a8,8,0,0,1,5.56,2.22,7.53,7.53,0,0,1,2.35,5.44h0v3.17h0a7.53,7.53,0,0,1-2.35,5.44,8,8,0,0,1-5.56,2.22h0a8,8,0,0,1-5.56-2.22,7.56,7.56,0,0,1-2.34-5.44h0v-3.17h0a7.56,7.56,0,0,1,2.34-5.44,8,8,0,0,1,5.56-2.22h0Z" transform="translate(-7.28 -7.01)"/></g><g id="g68"><path id="path70" class="cls-3" d="M81.81,173.78v11.71h6.56a2.13,2.13,0,0,0,2.13-2.14h0a2.12,2.12,0,0,0-.56-1.44l-.07-.06a2.09,2.09,0,0,0-1.5-.64H86.11a1.7,1.7,0,0,1,0-3.4h.77a2.09,2.09,0,0,0,1.28-.59h0a2,2,0,0,0,.6-1.43h0a2,2,0,0,0-2-2H81.81Zm-3.4,5.75v-7.38h0a1.64,1.64,0,0,1,.14-.67,2,2,0,0,1,.39-.59l0,0h0a1.74,1.74,0,0,1,1.12-.48h6.65a5.41,5.41,0,0,1,5.41,5.41h0a5.47,5.47,0,0,1-.83,2.88,5.44,5.44,0,0,1,1,.76l.11.12a5.5,5.5,0,0,1,1.51,3.79h0a5.53,5.53,0,0,1-5.52,5.52H80.11a1.7,1.7,0,0,1-1.7-1.7Z" transform="translate(-7.28 -7.01)"/></g></svg>
                <span>Multibanco</span>
              </div>
            </label>
          </div>

          {payment === 'mbway' && (
            <div className="payment-details-form">
              <p style={{fontSize:13,color:'#555',marginBottom:10}}>Insira o seu número MB WAY para receber a notificação de pagamento.</p>
              <IMaskInput
                mask="000 000 000"
                placeholder="9xx xxx xxx"
                value={formData.telemovel.replace('+351 ', '')}
                style={{maxWidth:200}}
              />
            </div>
          )}

          {payment === 'multibanco' && (
            <div className="payment-details-form">
              <p style={{fontSize:13,color:'#555'}}>A referência e entidade serão geradas após finalizar a encomenda.</p>
            </div>
          )}
        </section>

        <section className="checkout-section summary-section">
          <h2 className="checkout-section-title">3. Resumo da encomenda</h2>
          <div className="qty-row" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
            <span style={{fontSize:14, fontWeight:500}}>Quantidade:</span>
            <QtySelector qty={qty} onQtyChange={onQtyChange}/>
          </div>
          <div className="summary-row"><span>Itens:</span><span>€{subtotal.toFixed(2).replace('.', ',')}</span></div>
          <div className="summary-row"><span>Envio:</span><span>€0,00</span></div>
          <div className="summary-total"><span>Total:</span><span>€{total.toFixed(2).replace('.', ',')}</span></div>
          
          <button type="submit" className="checkout-submit-btn">
            Finalizar Compra
          </button>
          <p className="checkout-terms">Ao confirmar, aceita as Condições de Venda da Amazon.</p>
        </section>
      </form>
    </div>
  )
}

// ============ SVG ICONS ============
// All icons use fill="currentColor" / stroke="currentColor" so they inherit
// color from CSS. Pass explicit color via style or className on the parent.

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
    <circle cx="11" cy="11" r="7" stroke="#333" strokeWidth="2.2"/>
    <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="#333" strokeWidth="2.2" strokeLinecap="round"/>
  </svg>
)

const LocationIcon = ({ color = '#FF9900', size = 16 }) => (
  <svg viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg" width={size} height={size} style={{flexShrink:0}}>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>
)

const UserIcon = ({ color = '#fff', size = 26 }) => (
  <svg viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
  </svg>
)

const CartIcon = ({ color = '#fff', size = 26 }) => (
  <svg viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
    <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.6L5.2 14c-.2.3-.2.7-.2 1 0 1.1.9 2 2 2h14v-2H7.4c-.1 0-.2-.1-.2-.2v-.1l1-1.8H19c.7 0 1.4-.4 1.7-1l3.6-6.4c.4-.7-.1-1.5-.9-1.5H5.2L4.3 2H1z"/>
  </svg>
)

const HeartIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" fill={filled ? '#C7511F' : 'none'} stroke={filled ? '#C7511F' : '#555'} strokeWidth="2" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
)

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
)

const ChevronDown = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={size} height={size}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

const ArrowRight = ({ size = 20, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" width={size} height={size}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)

const ListIcon = () => (
  <svg viewBox="0 0 24 24" fill="#007185" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
  </svg>
)

const ReportIcon = () => (
  <svg viewBox="0 0 24 24" fill="#007185" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
  </svg>
)

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#067D62" strokeWidth="2.5" width="18" height="18">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" width="22" height="22">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" fill="#ccc" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
  </svg>
)

// ============ TOAST NOTIFICATION ============
function Toast({ message, visible }) {
  return (
    <div className={`toast ${visible ? 'toast-visible' : ''}`}>
      <CheckIcon/>
      <span>{message}</span>
    </div>
  )
}


// ============ HEADER ============
function Header({ onLogoClick }) {
  return (
    <header className="header">
      <div className="header-top">
        <button className="header-menu-btn" aria-label="Menu">
          <span/><span/><span/>
        </button>
        <a href="#" className="header-logo" onClick={(e) => { e.preventDefault(); onLogoClick() }}>
          <div style={{ display:'flex', flexDirection:'column' }}>
            <span className="logo-amazon">amazon</span>
            <svg className="logo-arrow" viewBox="0 0 60 12" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 6 Q30 14 58 6" stroke="#FF9900" strokeWidth="3" fill="none" strokeLinecap="round"/>
              <polygon points="54,3 58,6 54,9" fill="#FF9900"/>
            </svg>
          </div>
          <span className="logo-tld">.es</span>
        </a>
        <div className="header-auth">
          <a href="#" className="header-signin" id="signin-btn">
            <span style={{fontSize:11,opacity:0.85,lineHeight:1.2}}>Iniciar sessão ›</span>
            <UserIcon color="#fff" size={26}/>
          </a>
          <button className="header-cart" id="cart-btn" style={{background:'none',border:'none',cursor:'default',position:'relative',padding:'4px',opacity:0.7, pointerEvents:'none'}}>
            <CartIcon color="#fff" size={26}/>
          </button>
        </div>
      </div>
      <div className="header-search">
        <input className="search-input" type="text" aria-label="Pesquisar" id="search-input"/>
        <button className="search-btn" aria-label="Pesquisar"><SearchIcon/></button>
      </div>
    </header>
  )
}

// ============ SPONSORED BANNER ============
function SponsoredBanner() {
  return (
    <div className="sponsored-banner">
      <img className="sponsored-img" src="/watch_green.png" alt="WITHINGS ScanWatch 2" style={{objectFit:'contain',background:'#f5f5f5'}}/>
      <div className="sponsored-content">
        <div className="sponsored-title">WITHINGS ScanWatch 2, Relógio inteligente de saúde…</div>
        <div className="sponsored-price-row">
          <span className="sponsored-price">€349<sup>95</sup></span>
          <span className="prime-badge">prime</span>
          <div className="stars-row">
            <span className="stars">★★★★☆</span>
            <span className="review-count">3,9 · 1215</span>
          </div>
        </div>
      </div>
      <div className="sponsored-label">
        Patrocinado
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#565959"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
      </div>
    </div>
  )
}

// ============ SELLER HEADER ============
function SellerHeader() {
  return (
    <div className="seller-header">
      <div className="seller-logo">mi</div>
      <div className="seller-info">
        <div className="seller-name">XIAOMI</div>
        <a href="#" className="seller-visit">Visitar a loja</a>
      </div>
      <div className="seller-rating">
        <span style={{fontSize:13,color:'#555',fontWeight:600}}>4.1</span>
        <span className="stars" style={{fontSize:13}}>★★★★⭐</span>
        <span style={{fontSize:12,color:'#007185'}}>(78)</span>
      </div>
    </div>
  )
}

// ============ PRODUCT DESCRIPTION ============
function ProductDescription() {
  return (
    <div className="product-description">
      <p>XIAOMI Watch 5 Smartwatch, Google Wear OS, pagamentos NFC, AI com Gemini, ecrã de 1,54", até 6 dias de autonomia, GPS e rastreamento de fitness, controlo por gestos, 47 mm, Bluetooth, verde</p>
      <span className="exclusive-badge">Exclusivos da Amazon</span>
    </div>
  )
}

// ============ IMAGE CAROUSEL ============
function ProductImageCarousel({ selectedColor, wishlist, onWishlist }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const images = selectedColor === 'verde'
    ? ['/watch_green.png', '/watch_sapphire.png', '/watch_health.png', '/watch_gemini.png']
    : ['/watch_black.png', '/watch_sapphire.png', '/watch_health.png', '/watch_gemini.png']

  useEffect(() => setActiveIdx(0), [selectedColor])

  return (
    <div className="product-image-section">
      <div className="image-actions">
        <div className="image-dots">
          {images.map((_, i) => (
            <div key={i} className={`dot ${i === activeIdx ? 'active' : ''}`} onClick={() => setActiveIdx(i)} style={{cursor:'pointer'}}/>
          ))}
        </div>
        <div className="image-btns">
          <button className="icon-btn" aria-label="Guardar nos favoritos" onClick={onWishlist} id="wishlist-btn">
            <HeartIcon filled={wishlist}/>
          </button>
          <button className="icon-btn" aria-label="Partilhar" onClick={() => { navigator.share ? navigator.share({title:'Xiaomi Watch 5', url: window.location.href}) : alert('Link copiado!') }} id="share-btn">
            <ShareIcon/>
          </button>
        </div>
      </div>
      <div className="product-main-image-wrap" style={{position:'relative'}}>
        <img className="product-main-image" src={images[activeIdx]} alt={`Xiaomi Watch 5 - ${selectedColor}`}/>
        
        <button className="img-arrow prev" onClick={() => setActiveIdx(prev => (prev === 0 ? images.length - 1 : prev - 1))} aria-label="Anterior">
          ‹
        </button>
        <button className="img-arrow next" onClick={() => setActiveIdx(prev => (prev === images.length - 1 ? 0 : prev + 1))} aria-label="Próximo">
          ›
        </button>
      </div>
      {/* Thumbnail strip */}
      <div className="thumb-strip">
        {images.map((img, i) => (
          <button key={i} className={`thumb-btn ${i === activeIdx ? 'thumb-active' : ''}`} onClick={() => setActiveIdx(i)}>
            <img src={img} alt={`Vista ${i+1}`}/>
          </button>
        ))}
      </div>
    </div>
  )
}


// ============ BUY BUTTONS SECTION ============
function BuySection({ selectedColor, qty, onQtyChange, onBuyNow }) {
  const priceNum = 59.90
  const priceLabel = '59,90'
  
  return (
    <div className="buy-section">
      <div className="buy-price-row">
        <span className="buy-price-main">€{priceLabel}</span>
        <span className="buy-prime-badge">prime</span>
      </div>
      <div className="buy-returns">
        <a href="#" className="amazon-link-small">Devoluções GRÁTIS</a>
      </div>
      <div className="buy-delivery">
        <span className="buy-delivery-free">Entrega GRÁTIS</span>
        <span className="buy-delivery-date"> amanhã, 19 abr.</span>
      </div>
      
      <div className="buy-stock">Em stock</div>

      <div className="buy-qty-wrap" style={{marginBottom:18}}>
        <div style={{fontSize:14, fontWeight:600, marginBottom:8}}>Quantidade:</div>
        <QtySelector qty={qty} onQtyChange={onQtyChange}/>
      </div>

      <button className="btn-buy-now" id="buy-now-btn" onClick={() => onBuyNow()}>
        Comprar agora
      </button>

      <div className="buy-protection">
        <div className="protection-row">
          <span className="protection-label">Transação segura</span>
        </div>
        <div className="protection-details">
          <span className="details-label">Enviado por</span>
          <span className="details-value">Amazon</span>
        </div>
        <div className="protection-details">
          <span className="details-label">Vendido por</span>
          <span className="details-value">Xiaomi</span>
        </div>
      </div>

      <div className="buy-return-policy">
        <span className="policy-label">Devoluções:</span>
        <span className="policy-value"> Elegível para devolução, reembolso ou substituição no prazo de 30 dias após a receção</span>
      </div>
    </div>
  )
}

// ============ STICKY BUY BAR ============
function StickyBuyBar({ onBuyNow, selectedColor, qty }) {
  const priceNum = 59.90
  const totalLabel = (priceNum * qty).toFixed(2).replace('.', ',')
  return (
    <div className="sticky-buy-bar" id="sticky-bar">
      <div className="sticky-info">
        <div className="sticky-name">Xiaomi Watch 5</div>
        <div className="sticky-price">€{totalLabel}</div>
      </div>
      <div className="sticky-btns">
        <button className="btn-buy-now sticky-buy-btn" onClick={onBuyNow} style={{width:'100%'}}>Comprar</button>
      </div>
    </div>
  )
}

// ============ SAFETY SECTION ============
function SafetySection() {
  return (
    <div className="safety-section">
      <div className="safety-title">Segurança e recursos do produto</div>
      <a href="#" className="safety-link" style={{gap:6,display:'flex',alignItems:'flex-start'}}>
        <span style={{color:'#0F1111',marginTop:1}}>•</span>
        <span style={{color:'#007185'}}>Quer reciclar o seu produto GRATUITAMENTE?</span>
      </a>
    </div>
  )
}

// ============ COLOR SELECTOR ============
function ColorSelector({ selectedColor, setSelectedColor }) {
  const colors = [
    { id: 'preto', name: 'Preto', options: '9 opções de', price: '59,90 €', img: '/watch_black.png' },
    { id: 'verde', name: 'verde', options: '12 opções de', price: '59,90 €', img: '/watch_green.png' },
  ]
  return (
    <div className="color-section">
      <div className="color-label">Cor: <span>{selectedColor}</span></div>
      <div className="color-options">
        {colors.map(c => (
          <div key={c.id} className={`color-card ${selectedColor === c.name ? 'selected' : ''}`}
            onClick={() => setSelectedColor(c.name)} id={`color-${c.id}`}>
            <img className="color-card-img" src={c.img} alt={c.name}/>
            <div className="color-card-name">{c.name}</div>
            <div className="color-card-sub">{c.options}</div>
            <div className="color-card-sub">{c.price}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============ ACTION LINKS ============
function ActionLinks({ onAddToList, showToast }) {
  return (
    <div className="action-links">
      <button className="action-link-item" id="add-to-list-btn" onClick={onAddToList}>
        <ListIcon/>Adicionar à lista
      </button>
      <button className="action-link-item" id="report-problem-btn" onClick={() => showToast('Problema comunicado. Obrigado!')}>
        <ReportIcon/>Comunicar um problema com este produto
      </button>
    </div>
  )
}

// ============ ACCORDION ============
function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="accordion-item">
      <button className="accordion-header" onClick={() => setOpen(!open)} id={`accordion-${title.replace(/\s+/g,'-').toLowerCase()}`}>
        {title}
        <span style={{fontSize:20,lineHeight:1,flexShrink:0,transition:'transform 0.25s',transform:open?'rotate(0deg)':'rotate(180deg)',display:'inline-block',color:'#555'}}>∧</span>
      </button>
      <div className={`accordion-body ${open ? '' : 'collapsed'}`} style={{ maxHeight: open ? 2000 : 0 }}>
        {children}
      </div>
    </div>
  )
}

// ============ PRODUCT DETAILS ============
function ProductDetailsTabs() {
  const specs = [
    ['Sistema operativo', 'Wear OS by Google'],
    ['Capacidade de armazenamento da memória', '32 GB'],
    ['Funcionalidade especial', 'GPS, Rastreador de atividade, Monitor de saúde'],
    ['Tecnologia de conetividade', 'Bluetooth 5.3, NFC, Wi-Fi 802.11'],
    ['Norma de comunicação sem fios', '802.11a/b/g/n, Bluetooth'],
    ['Composição das células da bateria', 'Lítio Ião'],
    ['Dimensão do ecrã', '1,54 polegadas AMOLED'],
    ['Autonomia da bateria', 'Até 6 dias'],
  ]
  const galleryImgs = ['/watch_green.png', '/watch_black.png', '/watch_sapphire.png', '/watch_gemini.png', '/watch_health.png']
  const [showAll, setShowAll] = useState(false)

  return (
    <div className="details-section">
      <h2 className="details-title">Detalhes do produto</h2>
      <Accordion title="Principais destaques" defaultOpen={true}>
        <table className="specs-table">
          <tbody>
            {specs.map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}
          </tbody>
        </table>
        <ul className="highlights-list">
          <li>Ecrã AMOLED de 1,54" com resolução 466×466 px e vidro de safira de dupla face</li>
          {showAll && <>
            <li>Até 6 dias de autonomia com utilização normal</li>
            <li>Google Wear OS com acesso ao Google Gemini no pulso</li>
            <li>GPS integrado com suporte a múltiplos sistemas de navegação</li>
            <li>Mais de 150 modos desportivos</li>
            <li>Pagamentos contactless via NFC</li>
          </>}
        </ul>
        <button className="see-more-btn" id="see-more-btn" onClick={() => setShowAll(!showAll)}>
          {showAll ? '∧ Ver menos' : '∨ Ver mais'}
        </button>
      </Accordion>
      <Accordion title="Especificações do produto">
        <table className="specs-table">
          <tbody>
            <tr><td>Marca</td><td>Xiaomi</td></tr>
            <tr><td>Modelo</td><td>Watch 5</td></tr>
            <tr><td>Peso</td><td>38 g (sem bracelete)</td></tr>
            <tr><td>Caixa</td><td>Aço inoxidável 316L</td></tr>
            <tr><td>Resistência à água</td><td>5 ATM</td></tr>
            <tr><td>Sensores</td><td>Acelerómetro, Giroscópio, Barómetro, SpO2, FC</td></tr>
          </tbody>
        </table>
      </Accordion>
      <Accordion title="Galeria de imagens do produto">
        <div className="gallery-grid">
          {galleryImgs.map((img, i) => <img key={i} className="gallery-thumb" src={img} alt={`Imagem do produto ${i+1}`}/>)}
        </div>
      </Accordion>
      <Accordion title="O que está na caixa">
        <ul className="highlights-list" style={{paddingBottom:12}}>
          <li>1× Xiaomi Watch 5</li>
          <li>1× Bracelete (verde ou preto)</li>
          <li>1× Cabo de carregamento magnético</li>
          <li>1× Manual de utilização</li>
          <li>1× Guia de início rápido</li>
        </ul>
      </Accordion>
    </div>
  )
}

// ============ SAFETY FULL ============
function SafetyFullSection() {
  return (
    <div style={{ padding: '14px 12px', borderTop: '1px solid #D5D9D9' }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Segurança e recursos do produto</div>
      <div style={{ fontWeight: 600, fontSize: 13, color: '#0F1111', marginBottom: 4 }}>Imagens e contactos</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <a href="#" className="text-link">Imagens de segurança</a>
        <span style={{ color: '#555' }}>|</span>
        <a href="#" className="text-link">Contactos</a>
      </div>
    </div>
  )
}

// ============ AD BANNER ============
function AdBanner() {
  return (
    <div className="ad-banner" id="gaming-store-banner" onClick={() => alert('A redirecionar para a Amazon Gaming Store…')}>
      <div className="ad-banner-img" style={{background:'linear-gradient(135deg, #6A0DAD, #3D0070)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
          <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5S14.67 12 15.5 12s1.5.67 1.5 1.5S16.33 15 15.5 15zm3-3c-.83 0-1.5-.67-1.5-1.5S17.67 9 18.5 9s1.5.67 1.5 1.5S19.33 12 18.5 12z"/>
        </svg>
      </div>
      <div className="ad-banner-content">
        <div className="ad-banner-title">Amazon Gaming Store.</div>
        <div className="ad-banner-sub">Melhore o seu setup na Gaming Store.</div>
      </div>
      <div className="ad-banner-arrow"><ArrowRight/></div>
    </div>
  )
}

// ============ FROM MANUFACTURER ============
function FromManufacturer() {
  return (
    <div className="manufacturer-section">
      <div className="manufacturer-header">
        <h2>Do fabricante</h2>
        <div className="brand-hero">
          <div className="brand-hero-title"><span>xiaomi</span> Watch 5</div>
          <div className="brand-hero-sub">Cada vez más inteligente</div>
          <div className="wearos-badge">
            <span className="wearos-icon"/>
            Wear OS by Google
          </div>
          <img className="brand-watch-img" src="/watch_green.png" alt="Xiaomi Watch 5"/>
        </div>
        <div className="feature-cards">
          <div className="feature-card">
            <img className="feature-card-img" src="/watch_gemini.png" alt="Google Gemini"/>
            <div className="feature-card-label">Habla con Google Gemini directamente en tu muñeca</div>
          </div>
          <div className="feature-card">
            <img className="feature-card-img" src="/watch_health.png" alt="Bateria"/>
            <div className="feature-card-label">Hasta 6 días de duración de la batería ultralarga</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============ FEATURE TABS ============
function FeatureTabs() {
  const [activeTab, setActiveTab] = useState(0)
  const tabs = [
    { label: 'Zafiro doble cara', title: 'Cristal de zafiro de doble cara', img: '/watch_sapphire.png' },
    { label: 'Caja Acero 316L', title: 'Caixa em Aço Inoxidável 316L', img: '/watch_green.png' },
    { label: 'Colores', title: 'Mais cores disponíveis', img: '/watch_black.png' },
  ]
  return (
    <div className="feature-tabs-wrap">
      <div className="feature-tabs" role="tablist">
        {tabs.map((t, i) => (
          <div key={i} className={`feature-tab ${activeTab === i ? 'active' : ''}`}
            onClick={() => setActiveTab(i)} role="tab" id={`feature-tab-${i}`}>{t.label}</div>
        ))}
      </div>
      <div className="feature-tab-content">
        <div className="feature-tab-title">{tabs[activeTab].title}</div>
        <img className="feature-tab-img" src={tabs[activeTab].img} alt={tabs[activeTab].title}/>
      </div>
    </div>
  )
}

// ============ HEALTH TABS ============
function HealthTabs() {
  const [activeTab, setActiveTab] = useState(0)
  const tabs = [
    { label: 'Evaluación salud toque', title: 'Evaluación de salud con un solo toque\nSalud de un vistazo', img: '/watch_health.png' },
    { label: 'Monitoreo salud diario', title: 'Monitoreo continuo de salud', img: '/watch_gemini.png' },
    { label: '150+ mod. deportivos', title: 'Mais de 150 modos desportivos', img: '/watch_green.png' },
  ]
  return (
    <div className="health-tabs-wrap">
      <div className="health-tabs" role="tablist">
        {tabs.map((t, i) => (
          <div key={i} className={`health-tab ${activeTab === i ? 'active' : ''}`}
            onClick={() => setActiveTab(i)} role="tab" id={`health-tab-${i}`}>{t.label}</div>
        ))}
      </div>
      <div className="health-tab-content">
        <div className="health-tab-title">
          {tabs[activeTab].title.split('\n').map((line, i) => <span key={i}>{line}{i === 0 && <br/>}</span>)}
        </div>
        <img className="health-tab-img" src={tabs[activeTab].img} alt={tabs[activeTab].title}/>
      </div>
    </div>
  )
}

// ============ CUSTOMER QUESTIONS ============
function CustomerQuestions() {
  const questions = [
    { q: 'O relógio é compatível com iPhone?', a: 'Sim, o Xiaomi Watch 5 funciona com iOS 12.0 ou superior através da app Xiaomi Fitness, embora algumas funcionalidades do Wear OS sejam otimizadas para Android.' },
    { q: 'Tem NFC para pagamentos em Portugal?', a: 'Sim, suporta pagamentos NFC através do Google Pay (agora Google Wallet) com bancos compatíveis.' },
    { q: 'A pulseira é fácil de trocar?', a: 'Sim, utiliza um sistema de libertação rápida padrão de 22mm, permitindo trocar por qualquer pulseira compatível facilmente.' }
  ]

  return (
    <div className="questions-section">
      <h2 className="questions-title">Questões e respostas de clientes</h2>
      {questions.map((item, i) => (
        <div key={i} className="question-item">
          <div className="question-row">
            <span className="q-label">P:</span>
            <span className="q-text">{item.q}</span>
          </div>
          <div className="answer-row">
            <span className="a-label">R:</span>
            <span className="a-text">{item.a}</span>
          </div>
        </div>
      ))}
      <a href="#" className="see-more-questions" onClick={(e) => { e.preventDefault(); alert('A carregar mais questões…') }}>
        Ver todas as 24 questões ›
      </a>
    </div>
  )
}

// ============ RELATED PRODUCTS ============
function RelatedProducts() {
  const products = [
    { name: 'Xiaomi Redmi Watch 4', price: '98,00', stars: 4.5, reviews: '12.450', img: '/watch_black.png' },
    { name: 'Samsung Galaxy Watch 6', price: '189,00', stars: 4.8, reviews: '8.920', img: '/watch_sapphire.png' },
    { name: 'Apple Watch SE (2ª Geração)', price: '249,00', stars: 4.7, reviews: '25.600', img: '/watch_health.png' },
    { name: 'HUAWEI WATCH GT 4', price: '219,00', stars: 4.6, reviews: '3.120', img: '/watch_green.png' },
  ]

  return (
    <div className="related-section">
      <h2 className="related-title">Produtos relacionados com este artigo</h2>
      <div className="related-grid">
        {products.map((p, i) => (
          <div key={i} className="related-card" onClick={() => alert(`Visualizando ${p.name}`)}>
            <img src={p.img} alt={p.name} className="related-img" />
            <div className="related-info">
              <div className="related-name">{p.name}</div>
              <div className="related-rating">
                <StarRating count={Math.floor(p.stars)} />
                <span className="related-reviews">{p.reviews}</span>
              </div>
              <div className="related-price">€{p.price}</div>
              <div className="prime-badge-small">prime</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============ CUSTOMER REVIEWS ============
const REVIEWS = [
  { name: 'Alfonso', stars: 5, headline: 'Muy bonito!!', date: '11 de março de 2026', color: 'Preto', body: 'La verdad que no me esperaba que fuera tan bonito, me sorprendió sinceramente. Tiene muy buena calidad y un diseño muy elegante, no pesa y viene con cantidad de modos. Sin duda no me arrepiento de haberlo cogido 👍' },
  { name: 'Maria López', stars: 5, headline: 'Excelente relógio!', date: '3 de abril de 2026', color: 'verde', body: 'Chegou em perfeite estado e super rápido. O ecrã é incrível e o Wear OS funciona muito bem. Adoro o Google Gemini integrado! 🔥' },
  { name: 'Carlos M.', stars: 4, headline: 'Muito bom, mas bateria podia ser melhor', date: '22 de março de 2026', color: 'Preto', body: 'O relógio é lindo e funciona perfeitamente. A única coisa é que a bateria dura menos de 6 dias se usar GPS muito. De resto, recomendo!' },
  { name: 'João Silva', stars: 5, headline: 'O melhor smartwatch que já tive', date: '15 de abril de 2026', color: 'verde', body: 'Já tive vários smartwatches e este o Xiaomi Watch 5 é definitivamente o melhor. O vidro de safira dá uma premium de arrepiar. Vale cada cêntimo!' },
]

function StarRating({ count, max = 5 }) {
  return (
    <span>
      {Array.from({length: max}).map((_, i) => (
        <span key={i} className="stars" style={{fontSize:14, opacity: i < count ? 1 : 0.25}}>★</span>
      ))}
    </span>
  )
}

function CustomerReviews({ showToast }) {
  const [translated, setTranslated] = useState(false)
  return (
    <div className="reviews-section">
      <div className="reviews-top-link">
        <a href="#" className="text-link" style={{fontWeight:500}}>Comprar na KIBFLE ›</a>
      </div>
      <div className="reviews-summary">
        <h2 className="reviews-title">Avaliações de clientes</h2>
        <div className="reviews-rating-row">
          <div className="reviews-stars-big">
            <span className="stars" style={{fontSize:22}}>★★★★</span>
            <span className="stars" style={{fontSize:22,opacity:0.3}}>★</span>
          </div>
          <span className="reviews-score">4,1 de 5</span>
          <span className="reviews-arrow">›</span>
        </div>
        <div className="reviews-count">78 classificações globais</div>

        {/* Rating bars */}
        <div className="rating-bars">
          {[[5,62],[4,18],[3,10],[2,5],[1,5]].map(([stars, pct]) => (
            <div key={stars} className="rating-bar-row">
              <span className="rating-bar-label">{stars} estrelas</span>
              <div className="rating-bar-track"><div className="rating-bar-fill" style={{width:`${pct}%`}}/></div>
              <span className="rating-bar-pct">{pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="section-divider" style={{margin:'0 0 16px'}}/>
      <div className="reviews-with-images">
        <h3 className="reviews-subtitle">Avaliações com imagens</h3>
        <div className="reviews-images-row">
          <img className="review-img" src="/watch_black.png" alt="Review com imagem 1"/>
          <img className="review-img" src="/watch_green.png" alt="Review com imagem 2"/>
          <img className="review-img" src="/watch_sapphire.png" alt="Review com imagem 3"/>
        </div>
      </div>

      <div className="section-divider" style={{margin:'0 0 16px'}}/>
      <div className="reviews-top-spain">
        <h3 className="reviews-subtitle">Principais avaliações de Espanha</h3>
        <button className="translate-btn" id="translate-reviews-btn"
          onClick={() => { setTranslated(!translated); showToast(translated ? 'Avaliações no idioma original' : 'Avaliações traduzidas para português!') }}>
          {translated ? 'Ver no idioma original' : 'Traduzir todas as avaliações para português'}
        </button>
        {REVIEWS.map((r, i) => (
          <div key={i} className="review-item" style={{borderBottom: i < REVIEWS.length-1 ? '1px solid #f0f0f0' : 'none', paddingBottom:16, marginBottom:16}}>
            <div className="review-author-row">
              <div className="review-avatar">
                <svg viewBox="0 0 24 24" fill="#888" width="28" height="28">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
              </div>
              <span className="review-author-name">{r.name}</span>
            </div>
            <div className="review-stars-row">
              <StarRating count={r.stars}/>
              <span className="review-verified">Compra verificada</span>
            </div>
            <div className="review-headline">{r.headline}</div>
            <div className="review-date">Avaliado em Espanha a {r.date}</div>
            <div className="review-color">Cor: {r.color}</div>
            <p className="review-body">{r.body}</p>
          </div>
        ))}
        <button className="see-all-reviews-btn" id="see-all-reviews-btn"
          onClick={() => showToast('A carregar todas as 78 avaliações…')}>
          Ver todas as avaliações ›
        </button>
      </div>
    </div>
  )
}

// ============ FOOTER ============
function Footer() {
  const leftLinks = ['Página inicial','Transfira a app da Amazon','As minhas listas','A minha conta','Vender na Amazon','As suas devoluções','Definições de 1-Clique','Serviço de apoio ao cliente','Denunciar conteúdo ilegal']
  const rightLinks = ['A sua Amazon.es','Os seus pedidos','Presentes e lista de presentes','Histórico de navegação','Vender na Amazon Business','Alertas de recolhas e segurança de produtos','Reciclagem','Acessibilidade','Ir para o site de computador']
  return (
    <footer>
      <div className="footer-menu">
        <div className="footer-col">{leftLinks.map(l => <a key={l} href="#" className="footer-menu-link">{l}</a>)}</div>
        <div className="footer-col">{rightLinks.map(l => <a key={l} href="#" className="footer-menu-link">{l}</a>)}</div>
      </div>
      <div className="footer-lang">
        <button className="footer-lang-btn" id="footer-lang-btn">
          <GlobeIcon/>
          Português
        </button>
        <button className="footer-lang-btn" id="footer-region-btn">🇪🇸 Espanha</button>
      </div>
      <div className="footer-signin-row">
        <span>Já é cliente? </span><a href="#" className="footer-signin-link">Iniciar sessão</a>
      </div>
      <div className="footer-legal">
        {['Condições de utilização','Aviso de privacidade','Área jurídica','Aviso sobre cookies','Aviso de anúncios baseados em interesses'].map(l => (
          <a key={l} href="#" className="footer-legal-link">{l}</a>
        ))}
      </div>
      <div className="footer-copy">© 1996–2026, Amazon.com, Inc. ou empresas afiliadas</div>
    </footer>
  )
}

// ============ APP ============
export default function App() {
  const [page, setPage] = useState('product') // 'product' | 'checkout'
  const [selectedColor, setSelectedColor] = useState('verde')
  const [qty, setQty] = useState(1)
  const [wishlist, setWishlist] = useState(false)
  const [toast, setToast] = useState({ visible: false, msg: '' })

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [page])

  const showToast = (msg) => {
    setToast({ visible: true, msg })
    setTimeout(() => setToast({ visible: false, msg: '' }), 2800)
  }

  const handleBuyNow = () => {
    setPage('checkout')
  }

  const handleWishlist = () => {
    setWishlist(!wishlist)
    showToast(wishlist ? 'Removido dos favoritos' : '❤️ Guardado nos favoritos!')
  }

  const handleAddToList = () => showToast('📋 Adicionado à lista de desejos!')

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', paddingBottom: 70 }}>
      <Toast message={toast.msg} visible={toast.visible}/>
      <StickyBuyBar onBuyNow={handleBuyNow} selectedColor={selectedColor} qty={qty}/>

      <Header onLogoClick={() => setPage('product')}/>
      
      {page === 'product' ? (
        <main>
          <SponsoredBanner/>
          <SellerHeader/>
          <ProductDescription/>
          <ProductImageCarousel selectedColor={selectedColor} wishlist={wishlist} onWishlist={handleWishlist}/>
          <div className="section-divider"/>
          <SafetySection/>
          <ColorSelector selectedColor={selectedColor} setSelectedColor={setSelectedColor}/>

          {/* BUY SECTION */}
          <BuySection selectedColor={selectedColor} qty={qty} onQtyChange={setQty} onBuyNow={handleBuyNow}/>

          <ActionLinks onAddToList={handleAddToList} showToast={showToast}/>
          <ProductDetailsTabs/>
          <SafetyFullSection/>
          <AdBanner/>
          {/* Section 13: Health tabs */}
          <HealthTabs/>

          {/* Section 15: Customer Questions */}
          <CustomerQuestions />

          {/* Section 16: Customer reviews */}
          <CustomerReviews showToast={showToast}/>
        </main>
      ) : (
        <Checkout 
          price={59.90}
          qty={qty}
          onQtyChange={setQty}
          onGoBack={() => setPage('product')} 
          showToast={showToast} 
          onSuccess={() => {
            setQty(1)
            setPage('product')
            alert('Encomenda realizada com sucesso!')
          }}
        />
      )}
      <Footer/>
    </div>
  )
}
