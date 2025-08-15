<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import axios from 'axios'

// 同網域部署用 ''；若固定打 Render，填完整網址
const API = '' // 'https://erp-ahup.onrender.com'

// ========== 分頁 ==========
const currentPage = ref('one')     // one: 入庫, two: 庫存, three: 出庫, four: 報表
const currentPage2 = ref('one-1')  // 入庫子頁
const currentPage3 = ref('one-1')  // 出庫子頁
const currentPage4 = ref('one-1')  // 報表子頁
const currentPageInv = ref('one-1') // 庫存子頁：one-1=庫存總覽, two-2=品項維護

// ========== 日期/查詢 ==========
const today = new Date().toISOString().split('T')[0]
const selectedDate = ref(today)
const selectedDate2 = ref('')
const selectedDate3 = ref(today)
const selectedDate4 = ref('')
const selectedDate5 = ref(today)
const selectedDate6 = ref('')

// ========== 清單 ==========
const recordList = ref([])
const recordList2 = ref([])

// 單筆輸入
const inRow  = ref({ item: '', quantity: '', price: '', note: '' })
const outRow = ref({ item: '', quantity: '', note: '' })

const editingId = ref(null)
const selectedItem  = ref('')
const selectedItem2 = ref('')

const isLoading = ref(false)

// ========== 品項（動態 from DB） ==========
const items = ref([])             // [{_id, name, salePrice}]
const itemNames = computed(() => items.value.map(i => i.name))

// 品項維護用
const newItem = ref({ name: '', salePrice: '' })
const editingItemId = ref(null)

// 拉取品項
const fetchItems = async () => {
  const { data } = await axios.get(`${API}/items`)
  items.value = data || []
  // 若目前輸入的品項已不存在，就清掉
  if (inRow.value.item && !itemNames.value.includes(inRow.value.item))  inRow.value.item = ''
  if (outRow.value.item && !itemNames.value.includes(outRow.value.item)) outRow.value.item = ''
  if (selectedItem.value && !itemNames.value.includes(selectedItem.value))   selectedItem.value = ''
  if (selectedItem2.value && !itemNames.value.includes(selectedItem2.value)) selectedItem2.value = ''
}

// 新增品項
const addItem = async () => {
  const name = (newItem.value.name || '').trim()
  const salePrice = Number(newItem.value.salePrice)
  if (!name) { alert('❌ 請輸入品項名稱'); return }
  if (isNaN(salePrice) || salePrice < 0) { alert('❌ 售價需為 >= 0 的數字'); return }
  try {
    await axios.post(`${API}/items`, { name, salePrice })
    newItem.value = { name: '', salePrice: '' }
    await fetchItems()
    // 其他頁同步
    await fetchRecords3()
  } catch (e) {
    alert('❌ 新增失敗：' + (e?.response?.data?.message || e.message))
  }
}

// 開始編輯品項
const startEditItem = (id) => { editingItemId.value = id }

// 確認更新品項（若名稱變更，後端會同步更新所有入/出庫 item）
const confirmEditItem = async (it) => {
  const name = (it.name || '').trim()
  const salePrice = Number(it.salePrice)
  if (!name) { alert('❌ 品項名稱不可空白'); return }
  if (isNaN(salePrice) || salePrice < 0) { alert('❌ 售價需為 >= 0 的數字'); return }
  try {
    await axios.put(`${API}/items/${it._id}`, { name, salePrice })
    editingItemId.value = null
    await fetchItems()
    // 因為品項可能改名，重新撈庫存/出庫/入庫清單與報表成本
    await fetchRecords3()
    if (currentPage.value === 'four') await fetchTotalAmount()
  } catch (e) {
    alert('❌ 更新失敗：' + (e?.response?.data?.message || e.message))
  }
}

// ========== 報表 ==========
const totalGroup1 = ref('') // 檸檬汁成本（整筆金額加總）
const totalGroup2 = ref('') // 蘋果汁成本
const qtyCake  = ref('')    // 檸檬汁份數
const qtyJuice = ref('')    // 蘋果汁份數

const unitPriceCake  = 50
const unitPriceJuice = 60
const revenueCake  = computed(() => Number(qtyCake.value || 0)  * unitPriceCake)
const revenueJuice = computed(() => Number(qtyJuice.value || 0) * unitPriceJuice)

const fixedExpense = ref('')
const extraExpense = ref('')
const netProfit = computed(() =>
  (revenueCake.value + revenueJuice.value)
  - (Number(totalGroup1.value || 0) + Number(totalGroup2.value || 0))
  - Number(fixedExpense.value || 0)
  - Number(extraExpense.value || 0)
)

// ========== 檢核 ==========
const isEmpty = (v) => v === '' || v === null || v === undefined
const isRowCompleteIn = (row) =>
  !!row.item && !isEmpty(row.quantity) && Number(row.quantity) > 0 &&
  !isEmpty(row.price) && Number(row.price) >= 0
const isRowCompleteOut = (row) =>
  !!row.item && !isEmpty(row.quantity) && Number(row.quantity) > 0 &&
  getAvgPrice(row.item) > 0

function checkOutStock () {
  const row = outRow.value
  if (!row.item || !row.quantity) return true
  const outQty = Number(row.quantity)

  const inQty = recordList.value
    .filter(r => r.item === row.item)
    .reduce((s, r) => s + Number(r.quantity), 0)

  const currentOutQty = recordList2.value
    .filter(r => r.item === row.item)
    .reduce((s, r) => s + Number(r.quantity), 0)

  if (outQty + currentOutQty > inQty) {
    const left = (inQty - currentOutQty).toFixed(2)
    alert(`【${row.item}】庫存不足，無法出庫 ${outQty}，目前庫存僅剩 ${left}`)
    return false
  }
  return true
}

const getAvgPrice = (item) => {
  const found = itemSummary.value.find(i => i.item === item)
  return found ? found.avgPrice : 0
}

// ========== 建單 ==========
const submitIn = async () => {
  const row = inRow.value
  if (!selectedDate.value) { alert('❌ 請選擇日期'); return }
  if (!isRowCompleteIn(row)) { alert('❌ 入庫：品項/數量/價格需填寫（數量>0，價格可為0）'); return }
  try {
    const payload = {
      item: row.item,
      quantity: Number(row.quantity),
      price: Number(Number(row.price).toFixed(2)), // 整筆金額
      note: row.note || '',
      date: selectedDate.value
    }
    await axios.post(`${API}/records`, payload)
    alert('✅ 入庫成功')
    await fetchRecords3()
    inRow.value = { item: '', quantity: '', price: '', note: '' }
  } catch (err) {
    alert('❌ 發送失敗：' + err.message)
  }
}

const submitOut = async () => {
  const row = outRow.value
  if (!selectedDate3.value) { alert('❌ 請選擇日期'); return }
  if (!isRowCompleteOut(row)) { alert('❌ 出庫：品項/數量需填（數量>0，平均單價>0）'); return }
  if (!checkOutStock()) return

  try {
    const qty = Number(row.quantity)
    const unit = Number(getAvgPrice(row.item))
    const lineTotal = Number((unit * qty).toFixed(2))
    const payload = {
      item: row.item,
      quantity: qty,
      price: lineTotal, // 整筆金額
      note: row.note || '',
      date: selectedDate3.value
    }
    await axios.post(`${API}/outrecords`, payload)
    alert('✅ 出庫成功')
    await fetchRecords3()
    outRow.value = { item: '', quantity: '', note: '' }
  } catch (err) {
    alert('❌ 發送失敗：' + err.message)
  }
}

// ========== 讀資料 ==========
const fetchRecords = async () => {
  try {
    let url = `${API}/records`
    const query = []
    if (selectedDate2.value) query.push('date=' + selectedDate2.value)
    if (selectedItem.value)  query.push('item=' + encodeURIComponent(selectedItem.value))
    if (query.length) url += '?' + query.join('&')
    const { data } = await axios.get(url)
    recordList.value = data
  } catch (err) {
    alert('❌ 無法取得資料：' + err.message)
  }
}
const fetchRecords2 = async () => {
  try {
    let url = `${API}/outrecords`
    const query = []
    if (selectedDate4.value) query.push('date=' + selectedDate4.value)
    if (selectedItem2.value) query.push('item=' + encodeURIComponent(selectedItem2.value))
    if (query.length) url += '?' + query.join('&')
    const { data } = await axios.get(url)
    recordList2.value = data
  } catch (err) {
    alert('❌ 無法取得出庫資料：' + err.message)
  }
}
const fetchRecords3 = async () => {
  try {
    isLoading.value = true
    const [inRes, outRes] = await Promise.all([
      axios.get(`${API}/records`),
      axios.get(`${API}/outrecords`)
    ])
    recordList.value = inRes.data
    recordList2.value = outRes.data
  } catch (err) {
    alert('❌ 取得庫存資料失敗：' + err.message)
  } finally {
    isLoading.value = false
  }
}

// 報表成本（整筆金額加總）
const fetchTotalAmount = async () => {
  if (!selectedDate5.value) { totalGroup1.value = ''; totalGroup2.value = ''; return }
  try {
    const { data } = await axios.get(`${API}/outrecords/total/${selectedDate5.value}`)
    totalGroup1.value = Number(data?.totalGroup1 || 0)
    totalGroup2.value = Number(data?.totalGroup2 || 0)
  } catch {
    totalGroup1.value = ''
    totalGroup2.value = ''
  }
}

// 報表自動帶入
const isAutofilling = ref(false)
async function loadReportForDate (dateStr) {
  if (!dateStr) return
  try {
    const { data } = await axios.get(`${API}/reports/${encodeURIComponent(dateStr)}`)
    isAutofilling.value = true
    if (data) {
      qtyCake.value   = Number(data?.qtyCake ?? 0)
      qtyJuice.value  = Number(data?.qtyJuice ?? 0)
      fixedExpense.value = Number(data?.fixedExpense ?? 0)
      extraExpense.value = Number(data?.extraExpense ?? 0)
    } else {
      qtyCake.value = 0; qtyJuice.value = 0; fixedExpense.value = 0; extraExpense.value = 0
    }
  } catch {
    isAutofilling.value = true
    qtyCake.value = 0; qtyJuice.value = 0; fixedExpense.value = 0; extraExpense.value = 0
  } finally {
    setTimeout(() => { isAutofilling.value = false }, 0)
  }
}

// 報表總攬
const reportList = ref([])
const costsByDate = ref({})
const isReportsLoading = ref(false)

async function fetchReportsList () {
  try {
    isReportsLoading.value = true
    const { data } = await axios.get(`${API}/reports`)
    reportList.value = (data || []).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    await fetchCostsForReports()
  } finally {
    isReportsLoading.value = false
  }
}
async function fetchCostsForReports () {
  const tasks = reportList.value.map(async (r) => {
    try {
      const { data } = await axios.get(`${API}/outrecords/total/${encodeURIComponent(r.date)}`)
      const { totalGroup1 = 0, totalGroup2 = 0 } = data || {}
      costsByDate.value[r.date] = { g1: Number(totalGroup1) || 0, g2: Number(totalGroup2) || 0 }
    } catch {
      costsByDate.value[r.date] = { g1: 0, g2: 0 }
    }
  })
  await Promise.all(tasks)
}
function getCosts (dateStr) { return costsByDate.value[dateStr] || { g1: 0, g2: 0 } }
function getQtyCake (r) { return Number(r?.qtyCake ?? 0) }
function getQtyJuice (r) { return Number(r?.qtyJuice ?? 0) }
function revenuePerItem (qty, unitPrice) { return Number(qty) * unitPrice }
function storedNet (r) { const n = r?.netProfit; return (n === 0 || (typeof n === 'number' && !Number.isNaN(n))) ? Number(n) : null }
function computedNet (r) {
  const c = getCosts(r.date)
  const revenue = revenuePerItem(getQtyCake(r), unitPriceCake) + revenuePerItem(getQtyJuice(r), unitPriceJuice)
  const cost = Number(c.g1) + Number(c.g2)
  const fe = Number(r.fixedExpense || 0)
  const ee = Number(r.extraExpense || 0)
  return revenue - cost - fe - ee
}
function dailyNet (r) { const s = storedNet(r); return s !== null ? s : computedNet(r) }

// 編修/刪除（入/出庫）
const confirmEdit = async () => {
  const editingRecord = recordList.value.find(r => r._id === editingId.value)
  try {
    await axios.put(`${API}/records/${editingId.value}`, editingRecord)
    editingId.value = null
    await fetchRecords()
  } catch (err) {
    alert('❌ 更新失敗：' + err.message)
  }
}
const confirmEdit2 = async () => {
  const editingRecord = recordList2.value.find(r => r._id === editingId.value)
  try {
    const api = currentPage.value === 'three' ? 'outrecords' : 'records'
    await axios.put(`${API}/${api}/${editingId.value}`, editingRecord)
    editingId.value = null
    currentPage.value === 'three' ? await fetchRecords2() : await fetchRecords()
  } catch (err) {
    alert('❌ 更新失敗：' + err.message)
  }
}
const startEditRecord  = (id) => { editingId.value = id }
const startEditRecord2 = (id) => { editingId.value = id }
const deleteRecord = async (id) => {
  if (!confirm('❌ 確定要刪除這筆資料嗎？')) return
  try { await axios.delete(`${API}/records/${id}`); await fetchRecords() }
  catch (err) { alert('❌ 刪除失敗：' + err.message) }
}
const deleteRecord2 = async (id) => {
  if (!confirm('❌ 確定要刪除這筆資料嗎？')) return
  try {
    const api = currentPage.value === 'three' ? 'outrecords' : 'records'
    await axios.delete(`${API}/${api}/${id}`)
    currentPage.value === 'three' ? await fetchRecords2() : await fetchRecords()
  } catch (err) { alert('❌ 刪除失敗：' + err.message) }
}
const deleteReportByDate = async (dateStr) => {
  if (!dateStr) return
  if (!confirm(`❌ 確定要清除 ${dateStr} 的報表資料嗎？`)) return
  try {
    await axios.delete(`${API}/reports/${encodeURIComponent(dateStr)}`)
    alert('✅ 已清除該日報表資料')
    await fetchReportsList()
  } catch (e) {
    alert('❌ 清除失敗：' + (e?.message || ''))
  }
}

// ========== 庫存彙總（以整筆金額計算平均單價） ==========
const itemSummary = computed(() => {
  const summary = []
  for (const item of itemNames.value) {
    const inRecords  = recordList.value.filter(r  => r.item === item)
    const inQty      = inRecords.reduce((sum, r) => sum + Number(r.quantity), 0)
    const inSumPrice = inRecords.reduce((sum, r) => sum + Number(r.price), 0)

    const outRecords  = recordList2.value.filter(r => r.item === item)
    const outQty      = outRecords.reduce((sum, r) => sum + Number(r.quantity), 0)
    const outSumPrice = outRecords.reduce((sum, r) => sum + Number(r.price), 0)

    const stockQty        = inQty - outQty
    const stockTotalPrice = inSumPrice - outSumPrice
    const avgPrice        = stockQty > 0 ? stockTotalPrice / stockQty : 0

    summary.push({ item, quantity: stockQty, avgPrice, totalPrice: stockTotalPrice })
  }
  return summary
})

const clearIn  = () => { inRow.value  = { item: '', quantity: '', price: '', note: '' } }
const clearOut = () => { outRow.value = { item: '', quantity: '', note: '' } }

// ========== 掛載/監聽 ==========
onMounted(async () => {
  await fetchItems()
  if (currentPage.value === 'two' || currentPage.value === 'three') fetchRecords3()
  else if (currentPage.value === 'four') { fetchTotalAmount(); loadReportForDate(selectedDate5.value) }
  else { fetchRecords() }
})

watch(
  [selectedDate, selectedDate2, selectedDate3, selectedDate4, selectedDate5, selectedDate6, selectedItem, selectedItem2, currentPage, currentPageInv],
  async () => {
    if (currentPage.value === 'two') {
      if (currentPageInv.value === 'one-1') await fetchRecords3()
      // 進到品項維護頁時，確保品項最新
      if (currentPageInv.value === 'two-2') await fetchItems()
    } else if (currentPage.value === 'three') {
      await fetchRecords3()
    } else if (currentPage.value === 'four') {
      await fetchTotalAmount()
      if (selectedDate5.value) await loadReportForDate(selectedDate5.value)
    } else {
      await fetchRecords()
    }
  },
  { immediate: true }
)

watch(currentPage4, (p) => {
  if (currentPage.value === 'four' && p === 'two-2') fetchReportsList()
})

// 報表規則（成本為 0 時，份數不可 > 0）
watch(qtyCake, (q) => {
  if (Number(totalGroup1.value || 0) === 0 && Number(q) > 0) {
    if (!isAutofilling.value) alert('❌ 檸檬汁的「銷貨成本」為 0，份數必須為 0')
    qtyCake.value = 0
  }
})
watch(qtyJuice, (q) => {
  if (Number(totalGroup2.value || 0) === 0 && Number(q) > 0) {
    if (!isAutofilling.value) alert('❌ 蘋果汁的「銷貨成本」為 0，份數必須為 0')
    qtyJuice.value = 0
  }
})

const submitReport = async () => {
  if (!selectedDate5.value) { alert('❌ 請先選擇報表日期'); return }
  const mustNumber = (v) => !(v === '' || v === null || v === undefined) && !isNaN(Number(v))
  if (!mustNumber(qtyCake.value) || !mustNumber(qtyJuice.value) || !mustNumber(fixedExpense.value) || !mustNumber(extraExpense.value)) {
    alert('❌ 請完整填寫數字（可為 0）'); return
  }
  if (Number(totalGroup1.value || 0) === 0 && Number(qtyCake.value) > 0) { alert('❌ 檸檬汁成本為 0，份數必須為 0'); qtyCake.value = 0; return }
  if (Number(totalGroup2.value || 0) === 0 && Number(qtyJuice.value) > 0) { alert('❌ 蘋果汁成本為 0，份數必須為 0'); qtyJuice.value = 0; return }

  const payload = {
    date: selectedDate5.value,
    qtyCake: Number(qtyCake.value),
    qtyJuice: Number(qtyJuice.value),
    fixedExpense: Number(fixedExpense.value || 0),
    extraExpense: Number(extraExpense.value || 0),
    netProfit: Number(netProfit.value || 0)
  }
  try {
    await axios.post(`${API}/reports`, payload)
    alert('✅ 報表已送出')
  } catch (err) {
    alert('❌ 報表傳送失敗：' + err.message)
  }
}
</script>

<template>
  <!-- 上方選單 -->
  <div class="d-flex justify-content-around">
    <div class="item p-3 text-center" :class="{ active: currentPage === 'one' }"   @click="() => { currentPage = 'one'; currentPage2 = 'one-1' }">入庫</div>
    <div class="item p-3 text-center" :class="{ active: currentPage === 'two' }"   @click="() => { currentPage = 'two'; currentPageInv = 'one-1' }">庫存</div>
    <div class="item p-3 text-center" :class="{ active: currentPage === 'three' }" @click="() => { currentPage = 'three'; currentPage3 = 'one-1'; fetchRecords3() }">出庫</div>
    <div class="item p-3 text-center" :class="{ active: currentPage === 'four' }"  @click="() => { currentPage = 'four' ; currentPage4 = 'one-1'}">報表</div>
  </div>

  <div class="page-content mt-4">
    <!-- 入庫（略：內容與你前一版相同） -->
    <!-- ... 這一段與你提供的版本相同，已在 <script> 區維持功能 ... -->

    <!-- 庫存 -->
    <div v-if="currentPage === 'two'">
      <!-- 子頁切換 -->
      <div class="d-flex justify-content-center align-items-center">
        <button style="min-width: 330px;" class="btn mb-3" :class="{ active: currentPageInv === 'one-1' }" @click="currentPageInv = 'one-1'">庫存總覽</button>
        <button style="min-width: 330px;" class="btn mb-3 ms-2" :class="{ active: currentPageInv === 'two-2' }" @click="() => { currentPageInv = 'two-2'; fetchItems() }">品項維護</button>
      </div>

      <!-- 庫存總覽 -->
      <div v-if="currentPageInv === 'one-1'" class="form-wrapper">
        <h5 class="title">庫存總覽</h5>

        <div v-if="isLoading" style="font-size: 14px; color: #888;">載入中...</div>

        <div v-else>
          <div v-if="itemSummary.length > 0" style="font-size: 14px;">
            <table class="table">
              <thead>
                <tr>
                  <th>品項</th>
                  <th>數量</th>
                  <th>平均單價</th>
                  <th>總價</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(record, index) in itemSummary" :key="index">
                  <td>{{ record.item }}</td>
                  <td>{{ Number(record.quantity).toFixed(2) }}</td>
                  <td>{{ Number(record.avgPrice).toFixed(2) }}</td>
                  <td>{{ Number(record.totalPrice).toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else style="font-size: 14px; color: #888;">
            目前無資料
          </div>
        </div>
      </div>

      <!-- 品項維護 -->
      <div v-else-if="currentPageInv === 'two-2'" class="form-wrapper">
        <h5 class="title">品項維護</h5>

        <!-- 新增 -->
        <div class="d-flex justify-content-center align-items-center gap-3 mb-3" style="max-width: 600px; margin: 0 auto;">
          <input v-model="newItem.name" placeholder="品項名稱（例：檸檬汁）" class="form-control" />
          <input v-model.number="newItem.salePrice" type="number" min="0" step="0.01" placeholder="售價" class="form-control" style="max-width: 160px;" />
          <button class="btn" style="min-width: 120px;" @click="addItem">新增品項</button>
        </div>

        <!-- 列表 -->
        <table class="table">
          <thead>
            <tr>
              <th>品項名稱</th>
              <th>售價</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="it in items" :key="it._id">
              <td class="items">
                <template v-if="editingItemId === it._id">
                  <input v-model="it.name" />
                </template>
                <template v-else>{{ it.name }}</template>
              </td>
              <td class="price">
                <template v-if="editingItemId === it._id">
                  <input type="number" v-model.number="it.salePrice" min="0" step="0.01" />
                </template>
                <template v-else>{{ Number(it.salePrice).toFixed(2) }}</template>
              </td>
              <td class="text-center">
                <template v-if="editingItemId === it._id">
                  <button class="update-btn" @click="confirmEditItem(it)">確認</button>
                </template>
                <template v-else>
                  <button class="update-btn" @click="startEditItem(it._id)">改</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>

        <div style="font-size:12px; color:#666;">＊修改名稱後，所有入庫/出庫紀錄會同步改用新名稱。</div>
      </div>
    </div>

    <!-- 出庫（含你先前改的：總覽查詢的價格欄位 disabled） -->
    <!-- 報表（維持原本規則） -->
    <!-- 入庫/出庫/報表其他區塊沿用你上一版的 template，這裡為精簡不重複貼出 -->
  </div>
</template>

<style scoped>
.item { background-color: #b2afaf; width: 50%; cursor: pointer; transition: background-color .2s; box-shadow: 2px 2px 8px rgba(0,0,0,.2);}
.item.active { background-color: #6c6d6e; color: #fff; }
.page-content { padding: 20px; min-height: 200px; text-align: center; font-size: 1.2rem; }
input[type="date"] { padding: 8px 24px; font-size: 1rem; border:1px solid #ccc; border-radius: 4px; width: 50%; }
.btn { background-color:#b2afaf; padding:10px; border-radius:4px; cursor:pointer; transition: background-color .2s; font-size:12px; white-space:nowrap; }
.btn:hover { background-color:#6c6d6e; color:#fff; }
.form-wrapper { max-width:800px; margin:20px auto; padding:10px; border-radius:8px; box-shadow:0 2px 10px rgba(0,0,0,.1); }
table { width:100%; border-collapse:collapse; margin-bottom:16px; }
th, td { border:none; padding:4px; text-align:center; font-size:12px; }
input { width:100%; padding:4px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px; }
.delete-btn { border:none; font-size:8px; cursor:pointer; border-radius:15px; background:#8d0205; color:#fff; padding:6px; }
.update-btn { border:none; font-size:8px; cursor:pointer; border-radius:15px; background:#1d35d0; color:#fff; padding:6px; }
select { width:100%; border:1px solid #ccc; border-radius:4px; box-sizing:border-box; }
td select, td input { min-height:30px; }
.items{ min-width:100px; }
.qty, .price, .price-text, .note { min-width:60px; }
input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
.title{ color:#f00; margin-bottom:1rem; }
.clear{ border:none; font-size:8px; cursor:pointer; border-radius:15px; background:#1d35d0; color:#fff; padding:6px; }
.report{ max-width:50px; }
.report2{ max-width:100px; }
.total-row > td { position:relative; padding-top:16px; }
.total-row > td::before { content:''; position:absolute; top:0; left:0; width:100%; height:2px; background:#666; }
.total-row > td:first-child::before { left:20%; width:100%; }
.total-row > td:last-child::before { width:80%; }
.report-table tbody tr { height:56px; }
.report-table tbody td { vertical-align:middle; }
</style>
