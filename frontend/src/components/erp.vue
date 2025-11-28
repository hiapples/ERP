<!-- frontend/src/components/erp.vue -->
<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import axios from 'axios'

// 若前後端同網域部署，用空字串；不同網域就填完整網址
const API = '' // 例如 'https://your-backend.onrender.com'

// 分頁
const currentPage = ref('one')     // one: 入庫, two: 庫存(成品設定), three: 出庫, four: 報表
const currentPage2 = ref('one-1')  // 入庫子頁
const currentPage3 = ref('one-1')  // 出庫子頁
const currentPage4 = ref('one-1')  // 報表子頁
const currentPageStock = ref('one-1') // 庫存子頁：one-1=庫存總覽, two-2=品項設定

const today = new Date().toISOString().split('T')[0]
const selectedDate = ref(today)
const selectedDate2 = ref('')
const selectedDate3 = ref(today)
const selectedDate4 = ref('')
const selectedDate5 = ref(today)

// 清單（統一用成品；不含任何金額欄位）
const recordList = ref([])   // 入庫（成品）
const recordList2 = ref([])  // 出庫（成品）
const isLoading = ref(false)

// 品項（動態從 DB）
const items = ref([])

// ====== 共用小工具 ======
const norm = (v) => (v == null ? '' : String(v).trim())
const _arr = (v) => (Array.isArray(v) ? v : (Array.isArray(v?.items) ? v.items : []))

// 僅保留成品
const productItems = computed(() => {
  const arr = _arr(items.value).filter(i => i?.type === 'product')
  return arr.slice().sort((a, b) => {
    const ka = a?.createdAt || a?._id || ''
    const kb = b?.createdAt || b?._id || ''
    return String(ka).localeCompare(String(kb)) // 由舊到新
  })
})

// 入庫/出庫皆選「成品」
const inOptions  = computed(() => productItems.value.map(i => i?.name).filter(Boolean))
const outOptions = computed(() => productItems.value.map(i => i?.name).filter(Boolean))

// 單筆輸入（成品；無金額）
const inRow  = ref({ item: '', quantity: '', note: '' })  // 成品入庫
const outRow = ref({ item: '', quantity: '', note: '' })  // 成品出庫

const editingId = ref(null)
const selectedItem  = ref('') // 入庫查詢用
const selectedItem2 = ref('') // 出庫查詢用

// === 入/出庫共用 ===
const isEmpty = (v) => v === '' || v === null || v === undefined
const isRowCompleteIn = (row) => !!row.item && !isEmpty(row.quantity) && Number(row.quantity) > 0
const isRowCompleteOut = (row) => !!row.item && !isEmpty(row.quantity) && Number(row.quantity) > 0

function clearIn () { inRow.value = { item: '', quantity: '', note: '' } }
function clearOut () { outRow.value = { item: '', quantity: '', note: '' } }

// === 讀取品項 ===
async function fetchItems () {
  const res = await axios.get(API + '/items')
  items.value = _arr(res?.data)
}

// === 入庫/出庫資料讀取（皆為成品；無金額） ===
const _arrData = (data) => (Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []))

const fetchRecords = async () => {
  try {
    let url = API + '/records'
    const q = []
    if (selectedDate2.value) q.push('date=' + selectedDate2.value)
    if (selectedItem.value)  q.push('item=' + encodeURIComponent(selectedItem.value))
    if (q.length) url += '?' + q.join('&')
    const { data } = await axios.get(url)
    recordList.value = _arrData(data)
  } catch (err) {
    alert('❌ 無法取得入庫資料：' + err.message)
  }
}

const fetchRecords2 = async () => {
  try {
    let url = API + '/outrecords'
    const q = []
    if (selectedDate4.value) q.push('date=' + selectedDate4.value)
    if (selectedItem2.value) q.push('item=' + encodeURIComponent(selectedItem2.value))
    if (q.length) url += '?' + q.join('&')
    const { data } = await axios.get(url)
    recordList2.value = _arrData(data)
  } catch (err) {
    alert('❌ 無法取得出庫資料：' + err.message)
  }
}

const fetchRecords3 = async () => {
  try {
    isLoading.value = true
    const [inRes, outRes] = await Promise.all([
      axios.get(API + '/records'),
      axios.get(API + '/outrecords')
    ])
    recordList.value  = _arrData(inRes?.data)
    recordList2.value = _arrData(outRes?.data)
  } catch (err) {
    alert('❌ 取得庫存資料失敗：' + err.message)
  } finally {
    isLoading.value = false
  }
}

// === 出庫總覽過濾（成品） ===
const recordList2Filtered = computed(() => {
  const targetProd = norm(selectedItem2.value)
  const targetDate = norm(selectedDate4.value)
  return recordList2.value.filter(r => {
    const dateOk = !targetDate || norm(r?.date) === targetDate
    const prodOk  = !targetProd || norm(r?.item) === targetProd
    return dateOk && prodOk
  })
})

// === 庫存彙總（只計數量） ===
const itemSummary = computed(() => {
  const summary = []
  const names = inOptions.value
  for (const prodName of names) {
    const key = norm(prodName)
    const inQty  = recordList.value.filter(r => norm(r?.item) === key).reduce((s, r) => s + Number(r?.quantity || 0), 0)
    const outQty = recordList2.value.filter(r => norm(r?.item) === key).reduce((s, r) => s + Number(r?.quantity || 0), 0)
    const stockQty = inQty - outQty
    summary.push({ item: prodName, quantity: stockQty })
  }
  return summary
})

// === 出庫時檢查庫存（只比數量） ===
function checkOutStock () {
  const row = outRow.value
  if (!row.item || !row.quantity) return true
  const key = norm(row.item)
  const inQty  = recordList.value.filter(r => norm(r?.item) === key).reduce((s, r) => s + Number(r?.quantity || 0), 0)
  const outQty = recordList2.value.filter(r => norm(r?.item) === key).reduce((s, r) => s + Number(r?.quantity || 0), 0)
  const left = inQty - outQty
  if (Number(row.quantity) > left + 1e-9) {
    alert(`❌【${row.item}】庫存不足，需要 ${Number(row.quantity).toFixed(2)}，現有 ${left.toFixed(2)}`)
    return false
  }
  return true
}

// === 送出入庫（無金額） ===
const submitIn = async () => {
  const row = inRow.value
  if (!selectedDate.value) { alert('❌ 請選擇日期'); return }
  if (!isRowCompleteIn(row)) { alert('❌ 入庫：品項/數量需填（數量>0）'); return }
  try {
    const payload = { item: row.item, quantity: Number(row.quantity), note: row.note || '', date: selectedDate.value }
    await axios.post(API + '/records', payload)
    alert('✅ 入庫成功')
    await fetchRecords3()
    clearIn()
  } catch (err) { alert('❌ 發送失敗：' + err.message) }
}

// === 送出出庫（無金額） ===
const submitOut = async () => {
  const row = outRow.value
  if (!selectedDate3.value) { alert('❌ 請選擇日期'); return }
  if (!isRowCompleteOut(row)) { alert('❌ 出庫：品項/數量需填（數量>0）'); return }
  if (!checkOutStock()) return
  try {
    const payload = { item: row.item, quantity: Number(Number(row.quantity).toFixed(2)), note: row.note || '', date: selectedDate3.value }
    await axios.post(API + '/outrecords', payload)
    alert('✅ 出庫成功（已從成品扣庫）')
    await fetchRecords3()
    if (selectedDate5.value !== selectedDate3.value) selectedDate5.value = selectedDate3.value
    await fetchReportOfDate()
    clearOut()
  } catch (err) { alert('❌ 發送失敗：' + err.message) }
}

// === 入/出庫列表編修 ===
const startEditRecord  = (id) => { editingId.value = id }
const startEditRecord2 = (id) => { editingId.value = id }

const confirmEdit = async () => {
  const rec = recordList.value.find(r => r?._id === editingId.value)
  try {
    await axios.put(API + '/records/' + editingId.value, rec)
    editingId.value = null
    await fetchRecords()
  } catch (err) { alert('❌ 更新失敗：' + err.message) }
}
const confirmEdit2 = async () => {
  const rec = recordList2.value.find(r => r?._id === editingId.value)
  try {
    await axios.put(API + '/outrecords/' + editingId.value, rec)
    editingId.value = null
    await fetchRecords2()
    await fetchReportOfDate()
  } catch (err) { alert('❌ 更新失敗：' + err.message) }
}
const deleteRecord = async (id) => {
  if (!confirm('❌ 確定要刪除這筆資料嗎？')) return
  try { await axios.delete(API + '/records/' + id); await fetchRecords() }
  catch (err) { alert('❌ 刪除失敗：' + err.message) }
}
const deleteRecord2 = async (id) => {
  if (!confirm('❌ 確定要刪除這筆資料嗎？')) return
  try { await axios.delete(API + '/outrecords/' + id); await fetchRecords2(); await fetchReportOfDate() }
  catch (err) { alert('❌ 刪除失敗：' + err.message) }
}

// === 成品設定（名稱、售價、耗材成本） ===
const itemEditingId = ref(null)
const newProduct = ref({ name: '', salePrice: '', consumableCost: '' })

const addProductItem = async () => {
  if (!newProduct.value.name) { alert('請輸入成品名稱'); return }
  try {
    await axios.post(API + '/items', {
      name: norm(newProduct.value.name),
      salePrice: Number(newProduct.value.salePrice || 0),
      consumableCost: Number(newProduct.value.consumableCost || 0),
      type: 'product'
    })
    newProduct.value = { name: '', salePrice: '', consumableCost: '' }
    await fetchItems()
  } catch (e) { alert('新增失敗：' + e.message) }
}
const startEditItem = (id) => { itemEditingId.value = id }
const confirmEditItem = async (it) => {
  try {
    const body = {
      name: norm(it.name),
      salePrice: Number(it.salePrice || 0),
      consumableCost: Number(it.consumableCost || 0)
    }
    await axios.put(API + '/items/' + it._id, body)
    itemEditingId.value = null
    await fetchItems()
  } catch (e) { alert('更新失敗：' + e.message) }
}
const deleteItem = async (id) => {
  if (!confirm('確定刪除該品項？')) return
  try { await axios.delete(API + '/items/' + id); await fetchItems() }
  catch (e) { alert('刪除失敗：' + (e?.message || '')) }
}

// === 報表（顯示營收、銷貨成本與四費用；淨利=營收-成本-四費用） ===
const reportQty = ref({})        // { [productName]: qty }

const stallFee = ref('')        // 攤販費
const parkingFee = ref('')      // 停車費
const treatFee = ref('')        // 請客費
const personnelFee = ref('')    // 油資費

// ★ 報表備註
const reportNote = ref('')      // 當日報表備註

// 成品名 → 每份耗材成本
const consumableMap = computed(() => {
  const m = {}
  for (const it of productItems.value) m[it.name] = Number(it.consumableCost || 0)
  return m
})

// 報表總覽：四費總 & 總成本 & 淨利（若後端沒給）
const fourFeesOfRow = (r) =>
  Number(r?.stallFee || 0) +
  Number(r?.parkingFee || 0) +
  Number(r?.treatFee || 0) +
  Number(r?.personnelFee || 0)

const totalCostOfRow = (r) =>
  Number(r?.costOfDay || 0) + fourFeesOfRow(r)

const netProfitOfRow = (r) =>
  Number(r?.revenueOfDay || 0) - totalCostOfRow(r)


// 取得某日已存的報表
function applyReportToForm(r) {
  const map = {}
  for (const it of productItems.value) map[it.name] = ''
  if (r?.items && Array.isArray(r.items)) {
    for (const row of r.items) {
      const name = String(row?.item || '')
      if (name in map) map[name] = Number(row?.qty || 0)
    }
  }
  reportQty.value = map
  stallFee.value     = Number((r?.stallFee ?? 0) || 0)
  parkingFee.value   = Number((r?.parkingFee ?? 0) || 0)
  treatFee.value     = Number((r?.treatFee ?? 0) || 0)
  personnelFee.value = Number((r?.personnelFee ?? 0) || 0)
  // ★ 報表備註載入
  reportNote.value   = r?.note || ''
}

const fetchReportOfDate = async () => {
  if (!selectedDate5.value) return
  try {
    const { data } = await axios.get(API + '/reports/' + selectedDate5.value)
    if (data) applyReportToForm(data)
    else {
      const map = {}; for (const it of productItems.value) map[it.name] = ''
      reportQty.value = map
      stallFee.value = parkingFee.value = treatFee.value = personnelFee.value = ''
      // ★ 清空備註
      reportNote.value = ''
    }
  } catch {
    const map = {}; for (const it of productItems.value) map[it.name] = ''
    reportQty.value = map
    stallFee.value = parkingFee.value = treatFee.value = personnelFee.value = ''
    // ★ 清空備註
    reportNote.value = ''
  }
}

// 報表表格資料（只有成品）
const reportTableItems = computed(() => productItems.value.map(p => ({ ...p, _kind: 'product' })))

// 單列營收/成本
const perProductRevenue = (it) => {
  const q = Number(reportQty.value[it.name] || 0)
  return q ? (q * Number(it.salePrice || 0)).toFixed(0) : ''
}
const productRowCost = (it) => {
  const q = Number(reportQty.value[it.name] || 0)
  return q ? (q * Number(consumableMap.value[it.name] || 0)).toFixed(2) : ''
}

// 合計
const revenueTotal = computed(() =>
  productItems.value.reduce((s, it) =>
    s + Number(reportQty.value[it.name] || 0) * Number(it.salePrice || 0), 0)
)
const costTotal = computed(() =>
  productItems.value.reduce((s, it) =>
    s + Number(reportQty.value[it.name] || 0) * Number(consumableMap.value[it.name] || 0), 0)
)

const netProfit = computed(() =>
  revenueTotal.value
  - costTotal.value
  - Number(stallFee.value || 0)
  - Number(parkingFee.value || 0)
  - Number(treatFee.value || 0)
  - Number(personnelFee.value || 0)
)

// 送出報表
const submitReport = async () => {
  if (!selectedDate5.value) { alert('❌ 請先選擇報表日期'); return }
  const unfilled = productItems.value.filter(it => isEmpty(reportQty.value[it.name]))
  if (unfilled.length > 0) {
    alert('❌ 以下成品的「份數」尚未填寫（可填 0）：\n' + unfilled.map(i => `• ${i.name}`).join('\n'))
    return
  }
  if (isEmpty(stallFee.value) || isEmpty(parkingFee.value) || isEmpty(treatFee.value) || isEmpty(personnelFee.value)) {
    alert('❌ 請填寫「攤販費 / 停車費 / 請客費 / 油資費」（可填 0）')
    return
  }
  const payload = {
    date: selectedDate5.value,
    items: productItems.value.map(it => ({ item: it.name, qty: Number(reportQty.value[it.name] || 0) })),
    stallFee: Number(stallFee.value || 0),
    parkingFee: Number(parkingFee.value || 0),
    treatFee: Number(treatFee.value || 0),
    personnelFee: Number(personnelFee.value || 0),
    // ★ 報表備註一併送出
    note: reportNote.value || ''
  }
  try {
    await axios.post(API + '/reports', payload)
    alert('✅ 報表已送出')
    await fetchReportsList()
  } catch (err) {
    alert('❌ 報表傳送失敗：' + err.message)
  }
}

// 報表總攬
const reportList = ref([])
const isReportsLoading = ref(false)
async function fetchReportsList () {
  try {
    isReportsLoading.value = true
    const { data } = await axios.get(API + '/reports')
    const arr = _arr(data) || []
    reportList.value = (arr || []).sort((a, b) => (b?.date || '').localeCompare(a?.date || ''))
  } finally {
    isReportsLoading.value = false
  }
}
const deleteReportByDate = async (dateStr) => {
  if (!dateStr) return
  if (!confirm(`❌ 確定要清除 ${dateStr} 的報表資料嗎？`)) return
  try {
    await axios.delete(API + '/reports/' + encodeURIComponent(dateStr))
    alert('✅ 已清除該日報表資料')
    await fetchReportsList()
  } catch (e) {
    alert('❌ 清除失敗：' + (e?.message || ''))
  }
}

// === 掛載/監聽 ===
onMounted(async () => {
  await fetchItems()
  if (currentPage.value === 'two' || currentPage.value === 'three') await fetchRecords3()
  else if (currentPage.value === 'four') { await fetchReportsList(); await fetchReportOfDate() }
  else { await fetchRecords() }
})

watch(
  [selectedDate, selectedDate2, selectedDate3, selectedDate4, selectedDate5, selectedItem, selectedItem2, currentPage, currentPageStock],
  async () => {
    if (currentPage.value === 'two' || currentPage.value === 'three') await fetchRecords3()
    else if (currentPage.value === 'four') { await fetchReportOfDate() }
    else { await fetchRecords() }
  },
  { immediate: false }
)

watch(currentPage4, async (p) => {
  if (currentPage.value === 'four' && p === 'two-2') await fetchReportsList()
})
</script>

<template>
  <!-- 上方選單 -->
  <div class="d-flex justify-content-around">
    <div class="item p-3 text-center" :class="{ active: currentPage === 'one' }"   @click="() => { currentPage = 'one'; currentPage2 = 'one-1' }">入庫</div>
    <div class="item p-3 text-center" :class="{ active: currentPage === 'two' }"   @click="() => { currentPage = 'two'; currentPageStock = 'one-1' }">庫存</div>
    <div class="item p-3 text-center" :class="{ active: currentPage === 'three' }" @click="() => { currentPage = 'three'; currentPage3 = 'one-1'; fetchRecords3() }">出庫</div>
    <div class="item p-3 text-center" :class="{ active: currentPage === 'four' }"  @click="() => { currentPage = 'four' ; currentPage4 = 'one-1'; fetchReportsList(); fetchReportOfDate() }">報表</div>
  </div>

  <div class="page-content mt-4">
    <!-- 入庫（成品；無金額） -->
    <div v-if="currentPage === 'one'">
      <div v-if="currentPage2 === 'one-1'">
        <div class="d-flex justify-content-center align-items-center">
          <button style="min-width:330px;" class="btn mb-3" :class="{ active: currentPage2 === 'two-2' }" @click="() => { currentPage2 = 'two-2'; fetchRecords() }">入庫總覽</button>
        </div>

        <div class="form-wrapper">
          <h5 class="title">成品入庫</h5>
          <div class="d-flex justify-content-center mt-3">
            <div class="d-flex align-items-center gap-3 mb-3" style="width:100%;max-width:330px;">
              <div style="font-size:14px;white-space:nowrap;">日期&ensp;:</div>
              <input type="date" v-model="selectedDate" class="form-control" style="min-height:42px;flex:1;" />
            </div>
          </div>

          <table>
            <thead><tr><th></th><th>成品</th><th>數量</th><th>備註</th></tr></thead>
            <tbody>
              <tr>
                <td><div class="clear" @click="clearIn" type="button">空</div></td>
                <td class="items">
                  <select v-model="inRow.item">
                    <option v-for="option in inOptions" :key="option" :value="option">{{ option }}</option>
                  </select>
                </td>
                <td><input type="number" class="qty"   v-model.number="inRow.quantity" min="0.01" step="0.01" /></td>
                <td><input class="note" v-model="inRow.note" /></td>
              </tr>
            </tbody>
          </table>

          <div class="d-flex justify-content-end">
            <button class="btn text-center ms-2" @click="submitIn">送出</button>
          </div>
        </div>
      </div>

      <div v-else-if="currentPage2 === 'two-2'">
        <div class="d-flex justify-content-center align-items-center">
          <button style="min-width:330px;" class="btn mb-3" :class="{ active: currentPage2 === 'one-1' }" @click="currentPage2 = 'one-1'">新增入庫</button>
        </div>

        <div class="form-wrapper">
          <h5 class="title">入庫總覽查詢</h5>

          <div class="d-flex justify-content-center mt-3">
            <div class="d-flex align-items-center gap-3" style="width:100%;max-width:330px;">
              <div style="font-size:14px;white-space:nowrap;">日期&ensp;:</div>
              <input type="date" v-model="selectedDate2" class="form-control" style="min-height:42px;flex:1;" />
            </div>
          </div>

          <div class="d-flex justify-content-center mt-3 mb-3">
            <div class="d-flex align-items-center gap-3" style="width:100%;max-width:330px;">
              <div style="font-size:14px;white-space:nowrap;">成品&ensp;:</div>
              <select v-model="selectedItem" style="min-height:42px;font-size:14px;flex:1;">
                <option value=""></option>
                <option v-for="option in inOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </div>
          </div>

          <table>
            <thead><tr><th></th><th>成品</th><th>數量</th><th>備註</th><th v-if="!editingId">日期</th></tr></thead>
            <tbody>
              <tr v-for="record in recordList" :key="record._id">
                <td class="button">
                  <template v-if="editingId === record._id">
                    <button class="delete-btn" @click="deleteRecord(record._id)">刪</button>
                  </template>
                  <template v-else>
                    <button class="update-btn" @click="startEditRecord(record._id)">改</button>
                  </template>
                </td>

                <td class="items">
                  <template v-if="editingId === record._id">
                    <select v-model="record.item">
                      <option v-for="option in inOptions" :key="option" :value="option">{{ option }}</option>
                    </select>
                  </template>
                  <template v-else>{{ record.item }}</template>
                </td>

                <td class="qty">
                  <template v-if="editingId === record._id"><input type="number" v-model.number="record.quantity" min="0.01" step="0.01" /></template>
                  <template v-else>{{ Number(record.quantity).toFixed(2) }}</template>
                </td>

                <td class="note">
                  <template v-if="editingId === record._id"><input v-model="record.note" /></template>
                  <template v-else>{{ record.note }}</template>
                </td>

                <td>
                  <div style="display:flex;align-items:center;gap:6px;justify-content:center;">
                    <template v-if="editingId === record._id">
                      <button class="update-btn" style="padding:6px 10px;" @click="confirmEdit">確認</button>
                    </template>
                    <template v-else>{{ record.date }}</template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

        </div>
      </div>
    </div>

    <!-- 庫存（只顯示成品；無金額） -->
    <div v-else-if="currentPage === 'two'">
      <div class="d-flex justify-content-center align-items-center">
        <button v-if="currentPageStock === 'one-1'" style="min-width: 330px;" class="btn mb-3" :class="{ active: currentPageStock === 'two-2' }" @click="() => { currentPageStock = 'two-2'; fetchItems() }">成品設定</button>
        <button v-else style="min-width: 330px;" class="btn mb-3" :class="{ active: currentPageStock === 'one-1' }" @click="() => { currentPageStock = 'one-1'; fetchRecords3() }">庫存總覽</button>
      </div>

      <div v-if="currentPageStock === 'one-1'" class="form-wrapper">
        <h5 class="title">庫存總覽</h5>
        <div v-if="isLoading" style="font-size:14px;color:#888;">載入中...</div>
        <div v-else>
          <div v-if="itemSummary.length > 0" style="font-size:14px;">
            <table class="table">
              <thead><tr><th>成品</th><th>數量</th></tr></thead>
              <tbody>
                <tr v-for="(r, idx) in itemSummary" :key="idx">
                  <td>{{ r.item }}</td>
                  <td>{{ Number(r.quantity).toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else style="font-size:14px;color:#888;">目前無資料</div>
        </div>
      </div>

      <!-- 成品設定（含耗材成本） -->
      <div v-else-if="currentPageStock === 'two-2'" class="form-wrapper">
        <h5 class="title">成品設定</h5>
        <table class="table product-table ms-5">
          <thead>
            <tr>
              <th>成品名稱</th>
              <th>售價</th>
              <th>成本</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="it in productItems" :key="it._id">
              <td>
                <template v-if="itemEditingId === it._id"><input v-model="it.name" /></template>
                <template v-else>{{ it.name }}</template>
              </td>
              <td style="max-width:120px;">
                <template v-if="itemEditingId === it._id"><input type="number" step="0.01" min="0" v-model.number="it.salePrice" /></template>
                <template v-else>{{ Number(it.salePrice || 0).toFixed(2) }}</template>
              </td>
              <td style="max-width:120px;">
                <template v-if="itemEditingId === it._id"><input type="number" step="0.01" min="0" v-model.number="it.consumableCost" /></template>
                <template v-else>{{ Number(it.consumableCost || 0).toFixed(2) }}</template>
              </td>
              <td class="text-center">
                <template v-if="itemEditingId === it._id">
                  <button class="update-btn" @click="confirmEditItem(it)">存</button>
                  <button class="delete-btn ms-2" @click="deleteItem(it._id)">刪</button>
                </template>
                <template v-else>
                  <button class="update-btn" @click="startEditItem(it._id)">改</button>
                  <button class="delete-btn ms-2" @click="deleteItem(it._id)">刪</button>
                </template>
              </td>
            </tr>
            <tr>
              <td><input placeholder="新成品名稱" v-model="newProduct.name" /></td>
              <td><input type="number" step="0.01" min="0" placeholder="售價" v-model.number="newProduct.salePrice" /></td>
              <td><input type="number" step="0.01" min="0" placeholder="成本" v-model.number="newProduct.consumableCost" /></td>
              <td class="text-center"><button class="update-btn" @click="addProductItem">新增</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 出庫（成品；無金額） -->
    <div v-if="currentPage === 'three'">
      <div v-if="currentPage3 === 'one-1'">
        <div class="d-flex justify-content-center align-items-center">
          <button style="min-width:330px;" class="btn mb-3" :class="{ active: currentPage3 === 'two-2' }" @click="() => { currentPage3 = 'two-2'; fetchRecords2() }">出庫總覽</button>
        </div>

        <div class="form-wrapper">
          <h5 class="title">成品出庫</h5>
          <div class="d-flex justify-content-center mt-3">
            <div class="d-flex align-items-center gap-3 mb-3" style="width:100%;max-width:330px;">
              <div style="font-size:14px;white-space:nowrap;">日期&ensp;:</div>
              <input type="date" v-model="selectedDate3" class="form-control" style="min-height:42px;flex:1;" />
            </div>
          </div>

          <table>
            <thead><tr><th></th><th>成品</th><th>數量</th><th>備註</th></tr></thead>
            <tbody>
              <tr>
                <td><div type="button" class="clear" @click="clearOut">空</div></td>
                <td class="items">
                  <select v-model="outRow.item">
                    <option v-for="option in outOptions" :key="option" :value="option">{{ option }}</option>
                  </select>
                </td>
                <td><input type="number" class="qty" v-model.number="outRow.quantity" min="0.01" step="0.01" /></td>
                <td><input class="note" v-model="outRow.note" /></td>
              </tr>
            </tbody>
          </table>

          <div class="d-flex justify-content-end"><button class="btn text-center ms-2" @click="submitOut">送出</button></div>
        </div>
      </div>

      <!-- 出庫總覽（成品） -->
      <div v-else-if="currentPage3 === 'two-2'">
        <div class="d-flex justify-content-center align-items-center">
          <button style="min-width:330px;" class="btn mb-3" :class="{ active: currentPage3 === 'one-1' }" @click="currentPage3 = 'one-1'">新增出庫</button>
        </div>

        <div class="form-wrapper">
          <h5 class="title">出庫總覽查詢</h5>

          <div class="d-flex justify-content-center mt-3">
            <div class="d-flex align-items-center gap-3" style="width:100%;max-width:330px;">
              <div style="font-size:14px;white-space:nowrap;">日期&ensp;:</div>
              <input type="date" v-model="selectedDate4" class="form-control" style="min-height:42px;flex:1;" />
            </div>
          </div>

          <div class="d-flex justify-content-center mt-3">
            <div class="d-flex align-items-center mb-3 gap-3" style="width:100%;max-width:330px;">
              <div style="font-size:14px;white-space:nowrap;">成品&ensp;:</div>
              <select v-model="selectedItem2" style="min-height:42px;font-size:14px;flex:1;">
                <option value=""></option>
                <option v-for="option in inOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </div>
          </div>

          <table>
            <thead><tr><th></th><th>成品</th><th>數量</th><th>備註</th><th v-if="!editingId">日期</th></tr></thead>
            <tbody>
              <tr v-for="record in recordList2Filtered" :key="record._id">
                <td class="button">
                  <template v-if="editingId === record._id">
                    <button class="delete-btn" @click="deleteRecord2(record._id)">刪</button>
                  </template>
                  <template v-else>
                    <button class="update-btn" @click="startEditRecord2(record._id)">改</button>
                  </template>
                </td>

                <td class="items">
                  <template v-if="editingId === record._id">
                    <select v-model="record.item">
                      <option v-for="option in inOptions" :key="option" :value="option">{{ option }}</option>
                    </select>
                  </template>
                  <template v-else>{{ record.item }}</template>
                </td>

                <td class="qty">
                  <template v-if="editingId === record._id"><input type="number" v-model.number="record.quantity" min="0.01" step="0.01" /></template>
                  <template v-else>{{ Number(record.quantity).toFixed(2) }}</template>
                </td>

                <td class="note">
                  <template v-if="editingId === record._id"><input v-model="record.note" /></template>
                  <template v-else>{{ record.note }}</template>
                </td>

                <td>
                  <div style="display:flex;align-items:center;gap:6px;justify-content:center;">
                    <template v-if="editingId === record._id"><button class="update-btn" style="padding:6px 10px;" @click="confirmEdit2">確認</button></template>
                    <template v-else>{{ record.date }}</template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

        </div>
      </div>
    </div>

    <!-- 報表（含營收、銷貨成本、四費用與淨利） -->
    <div v-if="currentPage === 'four'">
      <div v-if="currentPage4 === 'one-1'">
        <div class="d-flex justify-content-center align-items-center">
          <button style="min-width:330px;" class="btn mb-3" :class="{ active: currentPage4 === 'two-2' }" @click="() => { currentPage4 = 'two-2'; fetchReportsList() }">報表總覽</button>
        </div>

        <div class="form-wrapper">
          <h5 class="title">報表紀錄</h5>

          <div class="d-flex justify-content-center mt-3">
            <div class="d-flex align-items-center gap-3 mb-3" style="width:100%;max-width:330px;">
              <div style="font-size:14px;white-space:nowrap;">日期&ensp;:</div>
              <input type="date" v-model="selectedDate5" class="form-control" style="min-height:42px;flex:1;" @change="() => { fetchReportOfDate() }" />
            </div>
          </div>

          <table class="text-center align-middle">
            <thead><tr><th>成品</th><th>份數 × 售價</th><th>營業收入</th><th>銷貨成本</th></tr></thead>
            <tbody>
              <tr v-for="it in reportTableItems" :key="it._id">
                <td>{{ it.name }}</td>
                <td class="d-flex justify-content-center align-items-center gap-2">
                  <input v-model.number="reportQty[it.name]" type="number" min="0" step="1" class="form-control text-center report" style="display:inline-block;" />
                  <span>× {{ Number(it.salePrice || 0).toFixed(0) }}</span>
                </td>
                <td>{{ perProductRevenue(it) }}</td>
                <td>{{ productRowCost(it) }}</td>
              </tr>

              <tr><td>&ensp;</td><td>&ensp;</td><td>&ensp;</td><td>&ensp;</td></tr>

              <tr class="total-row">
                <td>總計</td>
                <td></td>
                <td>{{ revenueTotal.toFixed(0) }}</td>
                <td>{{ costTotal.toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>

          <!-- 四格費用 -->
          <div class="fees-grid mt-3">
            <div class="fee"><label>攤販費：</label><input v-model.number="stallFee" type="number" min="0" step="1" class="form-control text-center report2" /></div>
            <div class="fee"><label>停車費：</label><input v-model.number="parkingFee" type="number" min="0" step="1" class="form-control text-center report2" /></div>
            <div class="fee"><label>油資費：</label><input v-model.number="personnelFee" type="number" min="0" step="1" class="form-control text-center report2" /></div>
            <div class="fee"><label>試喝費：</label><input v-model.number="treatFee" type="number" min="0" step="1" class="form-control text-center report2" /></div>
          </div>

          <!-- ★ 報表備註輸入框 -->
          <div class="d-flex justify-content-center align-items-center gap-3 mt-3" style="max-width:360px;margin:0 auto;">
            <div class="fw-bold" style="white-space:nowrap;">地點：</div>
            <input
              v-model="reportNote"
              type="text"
              class="form-control"
            />
          </div>
          <div class="d-flex justify-content-center align-items-center gap-3 mt-3">
            <div class="fw-bold">淨利：</div>
            <div>{{ netProfit.toFixed(2) }}</div>
          </div>
          <div class="d-flex justify-content-center mt-3">
            <button class="btn" style="min-width:200px;" @click="submitReport">送出報表</button>
          </div>
        </div>
      </div>

      <!-- 報表總攬 -->
      <div v-else-if="currentPage4 === 'two-2'">
        <div class="d-flex justify-content-center align-items-center">
          <button style="min-width:330px;" class="btn mb-3" :class="{ active: currentPage4 === 'one-1' }" @click="currentPage4 = 'one-1'">報表紀錄</button>
        </div>

        <div class="form-wrapper">
          <h5 class="title">報表總覽</h5>

          <div v-if="isReportsLoading" style="font-size:14px;color:#888;">載入中...</div>
          <div v-else>
            <div v-if="reportList.length > 0" style="font-size:14px;">
              <table class="table report-table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>總營收</th>
                    <th>總成本</th>
                    <th>淨利</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in reportList" :key="r._id || r.date">
                    <td>{{ r.date }}</td>
                    <td>{{ Number(r.revenueOfDay || 0).toFixed(0) }}</td>

                    <!-- 總成本 = 銷貨成本 + 四費總 -->
                    <td>{{ totalCostOfRow(r).toFixed(2) }}</td>

                    <!-- 後端若無 netProfit，用前端計算 -->
                    <td>
                      {{
                        r?.netProfit == null
                          ? netProfitOfRow(r).toFixed(2)
                          : Number(r.netProfit).toFixed(2)
                      }}
                    </td>

                    <td class="text-center">
                      <button class="delete-btn" @click="deleteReportByDate(r.date)">刪</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else style="font-size:14px;color:#888;">目前無資料</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.item { background-color:#b2afaf; width:50%; cursor:pointer; transition:background-color .2s; box-shadow:2px 2px 8px rgba(0,0,0,.2); }
.item.active { background-color:#6c6d6e; color:#fff; }
.page-content { padding:20px; min-height:200px; text-align:center; font-size:1.2rem; }
input[type="date"] { padding:8px 24px; font-size:1rem; border:1px solid #ccc; border-radius:4px; width:50%; }
.btn { background-color:#b2afaf; padding:10px; border-radius:4px; cursor:pointer; transition:background-color .2s; font-size:12px; width:20%; white-space:nowrap; }
.btn:hover { background-color:#6c6d6e; color:#fff; }
.form-wrapper { max-width:800px; margin:20px auto; padding:10px; border-radius:8px; box-shadow:0 2px 10px rgba(0,0,0,.1); }
table { width:100%; border-collapse:collapse; margin-bottom:16px; }
th, td { border:none; padding:4px; text-align:center; font-size:12px; }
input { width:100%; padding:4px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px; }
.delete-btn { border:none; font-size:8px; cursor:pointer; border-radius:15px; background:#8d0205; color:#fff; padding:6px; }
.update-btn { border:none; font-size:8px; cursor:pointer; border-radius:15px; background:#1d35d0; color:#fff; padding:6px; }
select { width:100%; border:1px solid #ccc; border-radius:4px; box-sizing:border-box; }
td select, td input { min-height:30px; }

.items{ min-width:80px; }
.qty, .note { min-width:60px; }
.button{ max-width:20px; padding-left:0!important; padding-right:25px!important; }

input[type=number]::-webkit-outer-spin-button,
input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }

.title{ color:#f00; margin-bottom:1rem; }
.clear{ border:none; font-size:8px; cursor:pointer; border-radius:15px; background:#1d35d0; color:#fff; padding:6px; }
.report{ max-width:70px; }
.report2{ max-width:120px; }

/* 報表合計分隔線 */
.total-row > td { position:relative; padding-top:16px; }
.total-row > td::before { content:''; position:absolute; top:0; left:0; width:100%; height:2px; background:#666; }
.total-row > td:first-child::before { left:20%; width:100%; }
.total-row > td:last-child::before { width:80%; }

.report-table tbody tr { height:56px; }
.report-table tbody td { vertical-align:middle; }

/* 成品表格收窄 + 固定欄寬 */
.product-table { table-layout: fixed; }
.product-table th, .product-table td { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.product-table th:nth-child(1), .product-table td:nth-child(1) { width: 70px; }
.product-table th:nth-child(2), .product-table td:nth-child(2) { width: 60px; }
.product-table th:nth-child(3), .product-table td:nth-child(3) { width: 60px; }

/* 四格費用：兩欄排版 */
.fees-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-width: 360px; margin: 0 auto; }
.fee { display: flex; align-items: center; gap: 8px; justify-content: center; }
.fee label { font-size: 14px; white-space: nowrap; }
</style>
