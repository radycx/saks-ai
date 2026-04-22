import { useState, useEffect } from 'react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { 
  User, Lock, Phone, Search, CreditCard, History, Settings, Home,
  Users, BookOpen, BarChart3, LogOut, Upload, CheckCircle, 
  Eye, EyeOff, Image as ImageIcon, Edit, Save
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import './App.css'

// ============================================
// 类型定义
// ============================================
type UserRole = 'guest' | 'user' | 'admin'

interface RegularUser {
  id: string
  phone: string
  city: string
  district: string
  available_questions: number
  total_payment_amount: number
  valid_payment_count: number
  last_payment_date: string | null
  status: '正常' | '禁用'
  remark: string | null
  created_at: string
  updated_at: string
}

interface Question {
  id: string
  question_type: string
  business_type: string
  difficulty: string
  is_required: string
  question_content: string
  answer: string
  option_a?: string
  option_b?: string
  option_c?: string
  option_d?: string
  option_e?: string
  option_f?: string
  option_g?: string
  option_h?: string
  option_i?: string
  option_j?: string
  analysis?: string
}

interface PaymentRecord {
  id: string
  user_id: string
  phone: string
  payment_image_url?: string
  payment_amount: number
  upload_date: string
  audit_status: '待审核' | '已通过' | '已拒绝'
  audit_result?: string
  audit_remark?: string
  audited_amount?: number
  audit_date?: string
}

interface UsageRecord {
  id: string
  user_id: string
  phone: string
  search_content: string
  matched_count: number
  used_questions: number
  use_date: string
}

interface SystemConfig {
  id: string
  config_key: string
  config_value: string
  config_type: string
  description: string
}

// ============================================
// 福建省市县数据
// ============================================
const FUJIAN_CITIES: Record<string, string[]> = {
  '福州市': ['鼓楼区', '台江区', '仓山区', '马尾区', '晋安区', '长乐区', '福清市', '闽侯县', '连江县', '罗源县', '闽清县', '永泰县', '平潭试验区'],
  '厦门市': ['思明区', '湖里区', '海沧区', '集美区', '同安区', '翔安区'],
  '莆田市': ['城厢区', '涵江区', '荔城区', '秀屿区', '仙游县'],
  '三明市': ['三元区', '沙县区', '永安市', '明溪县', '清流县', '宁化县', '大田县', '尤溪县', '将乐县', '泰宁县', '建宁县'],
  '泉州市': ['鲤城区', '丰泽区', '洛江区', '泉港区', '石狮市', '晋江市', '南安市', '惠安县', '安溪县', '永春县', '德化县', '金门县'],
  '漳州市': ['芗城区', '龙文区', '龙海区', '长泰区', '云霄县', '漳浦县', '诏安县', '东山县', '南靖县', '平和县', '华安县'],
  '南平市': ['延平区', '建阳区', '邵武市', '武夷山市', '建瓯市', '顺昌县', '浦城县', '光泽县', '松溪县', '政和县'],
  '龙岩市': ['新罗区', '永定区', '漳平市', '长汀县', '上杭县', '武平县', '连城县'],
  '宁德市': ['蕉城区', '福安市', '福鼎市', '霞浦县', '古田县', '屏南县', '寿宁县', '周宁县', '柘荣县']
}

// ============================================
// Supabase 配置
// ============================================
const SUPABASE_URL = 'https://apbwolcyorxfuoadhbxv.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_PPAH56VB9-Uf6RHvm5HeYA_ipR-rD9n'

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ============================================
// 工具函数
// ============================================
const validatePhone = (phone: string): boolean => {
  // 手机号校验: 11位, 以1开头, 第二位3-9
  const regex = /^1[3-9]\d{9}$/
  return regex.test(phone)
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

const formatDateOnly = (dateStr: string): string => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

// ============================================
// 主应用组件
// ============================================
function App() {
  // 全局状态
  const [role, setRole] = useState<UserRole>('guest')
  const [currentUser, setCurrentUser] = useState<RegularUser | null>(null)
  const [loading, setLoading] = useState(false)
  const supabaseConnected = !!supabase
  
  const [adminUser, setAdminUser] = useState<string | null>(localStorage.getItem('adminUser'))
  
  // 系统配置
  const [systemConfig, setSystemConfig] = useState<Record<string, string>>({
    system_name: '食安AI学习答题助手',
    payment_instruction: '请扫码转账缴费，必须转账留言备注注册的手机号码，每次缴费金额30-60元，1元可使用2次AI食安员考试的生成答题功能（仅限福建省范围）。',
    answer_hint: '初次注册可试用2题，请输入准确的食安考试或练习题目内容，可以仅输入题目开头部分内容，如6-8个字，AI自动匹配生成。由于技术原因，可能会有个别食安考试题目无法识别，输入非食安考题无法生成题目和答案（仅限福建省范围）',
    payment_qrcode: '',
    questions_per_yuan: '2' // 题目数/元，默认1元2题
  })

  // 检查本地存储的登录状态
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser')
    const savedAdmin = localStorage.getItem('adminLoggedIn')
    
    if (savedAdmin === 'true') {
      setAdminUser(localStorage.getItem('adminUser'))
      setRole('admin')
    } else if (savedUser) {
      try {
        const user = JSON.parse(savedUser)
        setCurrentUser(user)
        setRole('user')
      } catch (e) {
        localStorage.removeItem('currentUser')
      }
    }
  }, [])

  // 加载系统配置
  useEffect(() => {
    if (supabase) {
      loadSystemConfig()
    }
  }, [supabaseConnected])

  const loadSystemConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
      
      if (error) throw error
      
      if (data) {
        const config: Record<string, string> = {}
        data.forEach((item: SystemConfig) => {
          config[item.config_key] = item.config_value
        })
        setSystemConfig(prev => ({ ...prev, ...config }))
      }
    } catch (e) {
      console.error('加载系统配置失败:', e)
    }
  }

  // 处理用户登录/注册
  const handleUserLogin = async (phone: string, city: string, district: string, isRegister: boolean) => {
    if (!validatePhone(phone)) {
      toast.error('请输入有效的手机号码')
      return false
    }
    
    setLoading(true)
    
    try {
      if (isRegister) {
        // 检查手机号是否已存在
        const { data: existingUser } = await supabase
          .from('regular_users')
          .select('*')
          .eq('phone', phone)
          .single()
        
        if (existingUser) {
          toast.error('该手机号已注册，请直接登录')
          setLoading(false)
          return false
        }
        
        // 创建新用户
        const { data: newUser, error: insertError } = await supabase
          .from('regular_users')
          .insert([{
            phone,
            city,
            district,
            available_questions: 2,
            status: '正常'
          }])
          .select()
          .single()
        
        if (insertError) throw insertError
        
        setCurrentUser(newUser)
        setRole('user')
        localStorage.setItem('currentUser', JSON.stringify(newUser))
        toast.success('注册成功！赠送2题试用')
      } else {
        // 登录
        const { data: user, error } = await supabase
          .from('regular_users')
          .select('*')
          .eq('phone', phone)
          .single()
        
        if (error || !user) {
          toast.error('手机号未注册，请先注册')
          setLoading(false)
          return false
        }
        
        if (user.status === '禁用') {
          toast.error('您账号已被禁用，请联系业务人员')
          setLoading(false)
          return false
        }
        
        setCurrentUser(user)
        setRole('user')
        localStorage.setItem('currentUser', JSON.stringify(user))
        toast.success('登录成功')
      }
      
      setLoading(false)
      return true
    } catch (e) {
      console.error('登录/注册失败:', e)
      toast.error('操作失败，请稍后重试')
      setLoading(false)
      return false
    }
  }

  // 处理管理员登录
  const handleAdminLogin = async (username: string, password: string) => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('password_hash')
        .eq('username', username)
        .single()
      
      if (error || !data) {
        toast.error('用户名或密码错误')
        return false
      }

      if (data.password_hash === password) {
        setAdminUser(username)
        setRole('admin')
        localStorage.setItem('adminLoggedIn', 'true')
        localStorage.setItem('adminUser', username)
        
        // 更新最后登录时间
        await supabase
          .from('admins')
          .update({ last_login: new Date().toISOString() })
          .eq('username', username)

        toast.success('管理员登录成功')
        return true
      } else {
        toast.error('用户名或密码错误')
        return false
      }
    } catch (e) {
      console.error('管理员登录异常:', e)
      toast.error('登录服务异常')
      return false
    }
  }

  // 退出登录
  // 退出登录
  const handleLogout = () => {
    setCurrentUser(null)
    setAdminUser(null)
    setRole('guest')
    localStorage.removeItem('currentUser')
    localStorage.removeItem('adminLoggedIn')
    localStorage.removeItem('adminUser')
    toast.success('已退出登录')
  }

  // 刷新用户信息
  const refreshUser = async () => {
    if (!supabase || !currentUser) return
    
    try {
      const { data, error } = await supabase
        .from('regular_users')
        .select('*')
        .eq('id', currentUser.id)
        .single()
      
      if (error) throw error
      
      if (data) {
        setCurrentUser(data)
        localStorage.setItem('currentUser', JSON.stringify(data))
      }
    } catch (e) {
      console.error('刷新用户信息失败:', e)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 第一行：标题 */}
          <div className="flex justify-between items-center h-12">
            <div className="flex items-center">
              <BookOpen className="h-6 w-6 text-blue-600 mr-2" />
              <h1 className="text-xl font-bold text-gray-900">
                {systemConfig.system_name || '食安AI学习答题助手'}
              </h1>
              {!supabaseConnected && (
                <Badge variant="destructive" className="ml-2">未连接</Badge>
              )}
            </div>
            
            {/* PC端：右侧信息 */}
            <div className="hidden md:flex items-center space-x-4">
              {role === 'user' && currentUser && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-1" />
                  <span className="mr-4">{currentUser.phone}</span>
                  <Badge variant="secondary">剩余 {currentUser.available_questions} 题</Badge>
                </div>
              )}
              
              {role === 'admin' && (
                <Badge variant="default">管理员</Badge>
              )}
              
              {role !== 'guest' && (
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-1" />
                  退出
                </Button>
              )}
            </div>
          </div>
          
          {/* 第二行：用户信息（仅移动端显示） */}
          {(role === 'user' || role === 'admin') && (
            <div className="md:hidden flex justify-between items-center py-2 border-t text-sm">
              {role === 'user' && currentUser && (
                <div className="flex items-center text-gray-600">
                  <Phone className="h-3 w-3 mr-1" />
                  <span>{currentUser.phone}</span>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    剩余 {currentUser.available_questions} 题
                  </Badge>
                </div>
              )}
              
              {role === 'admin' && (
                <Badge variant="default" className="text-xs">管理员</Badge>
              )}
              
              <Button variant="ghost" size="sm" onClick={handleLogout} className="h-7 px-2 text-xs">
                <LogOut className="h-3 w-3 mr-1" />
                退出
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {role === 'guest' && (
          <GuestView 
            onUserLogin={handleUserLogin}
            onAdminLogin={handleAdminLogin}
            loading={loading}
          />
        )}
        
        {role === 'user' && currentUser && (
          <UserView 
            user={currentUser}
            systemConfig={systemConfig}
            onRefreshUser={refreshUser}
          />
        )}
        
        {role === 'admin' && (
          <AdminView 
            systemConfig={systemConfig}
            onConfigUpdate={loadSystemConfig}
            adminUser={adminUser}
          />
        )}
      </main>
    </div>
  )
}

// ============================================
// 游客视图（登录/注册）
// ============================================
function GuestView({ 
  onUserLogin, 
  onAdminLogin, 
  loading 
}: { 
  onUserLogin: (phone: string, city: string, district: string, isRegister: boolean) => Promise<boolean>
  onAdminLogin: (username: string, password: string) => Promise<boolean>
  loading: boolean
}) {
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user')
  const [isRegister, setIsRegister] = useState(false)
  
  // 用户登录/注册表单
  const [phone, setPhone] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  
  // 管理员登录表单
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isRegister && (!selectedCity || !selectedDistrict)) {
      toast.error('请选择所在市县')
      return
    }
    const success = await onUserLogin(phone, selectedCity, selectedDistrict, isRegister)
    if (success) {
      setPhone('')
      setSelectedCity('')
      setSelectedDistrict('')
    }
  }

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onAdminLogin(adminUsername, adminPassword)
  }

  return (
    <div className="max-w-md mx-auto w-full">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'user' | 'admin')}>
        <div className="w-full mb-4" style={{ overflowX: 'visible' }}>
          <TabsList 
            className="flex w-full" 
            style={{ 
              flexWrap: 'nowrap', 
              gap: '0',
              width: '100%',
              overflow: 'visible'
            }}
          >
            <TabsTrigger 
              value="user" 
              className="flex-1 text-sm" 
              style={{ 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                minWidth: '0',
                width: '50%'
              }}
            >
              用户入口
            </TabsTrigger>
            <TabsTrigger 
              value="admin" 
              className="flex-1 text-sm" 
              style={{ 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                minWidth: '0',
                width: '50%'
              }}
            >
              管理员入口
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="user">
          <Card>
            <CardHeader>
              <CardTitle>{isRegister ? '用户注册' : '用户登录'}</CardTitle>
              <CardDescription>
                {isRegister 
                  ? '注册即送2题试用，请输入手机号和所在地区' 
                  : '请输入注册时的手机号登录'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="phone">手机号码</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="请输入11位手机号"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10"
                      maxLength={11}
                      required
                    />
                  </div>
                </div>
                
                {isRegister && (
                  <>
                    <div>
                      <Label>所在市</Label>
                      <Select value={selectedCity} onValueChange={(v) => { setSelectedCity(v); setSelectedDistrict('') }}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="选择所在市" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(FUJIAN_CITIES).map(city => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>所在区县</Label>
                      <Select value={selectedDistrict} onValueChange={setSelectedDistrict} disabled={!selectedCity}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="选择所在区县" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedCity && FUJIAN_CITIES[selectedCity]?.map(district => (
                            <SelectItem key={district} value={district}>{district}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? '处理中...' : (isRegister ? '注册' : '登录')}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button variant="link" onClick={() => setIsRegister(!isRegister)}>
                {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="admin">
          <Card>
            <CardHeader>
              <CardTitle>管理员登录</CardTitle>
              <CardDescription>请输入管理员账号和密码</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="admin-username">用户名</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="admin-username"
                      placeholder="请输入用户名"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="admin-password">密码</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="admin-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="请输入密码"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <Button type="submit" className="w-full">
                  登录
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================
// 用户视图
// ============================================
function UserView({ 
  user, 
  systemConfig,
  onRefreshUser 
}: { 
  user: RegularUser
  systemConfig: Record<string, string>
  onRefreshUser: () => void
}) {
  const [activeTab, setActiveTab] = useState<'answer' | 'payment' | 'history'>('answer')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  // 双重监听：resize + matchMedia，确保DevTools设备切换时也能正确更新
  useEffect(() => {
    const updateMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    // 初始检查
    updateMobile()
    
    // resize 监听
    window.addEventListener('resize', updateMobile)
    
    // matchMedia 监听（DevTools设备模拟更可靠）
    const mediaQuery = window.matchMedia('(max-width: 767.98px)')
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
    }
    
    try {
      mediaQuery.addEventListener('change', handleMediaChange)
    } catch (e) {
      // 兼容旧浏览器
      mediaQuery.addListener(handleMediaChange)
    }
    
    return () => {
      window.removeEventListener('resize', updateMobile)
      try {
        mediaQuery.removeEventListener('change', handleMediaChange)
      } catch (e) {
        mediaQuery.removeListener(handleMediaChange)
      }
    }
  }, [])

  return (
    <div className="relative min-h-screen">
      {/* 移动端底部导航栏 */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-[9999]">
          <div className="flex justify-around items-center h-16">
            <button
              onClick={() => setActiveTab('answer')}
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                activeTab === 'answer' ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <Search className="h-5 w-5" />
              <span className="text-xs mt-1">AI答题</span>
            </button>
            <button
              onClick={() => setActiveTab('payment')}
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                activeTab === 'payment' ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <CreditCard className="h-5 w-5" />
              <span className="text-xs mt-1">缴费充值</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                activeTab === 'history' ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <History className="h-5 w-5" />
              <span className="text-xs mt-1">使用记录</span>
            </button>
          </div>
        </div>
      )}

      {/* 主内容区域 */}
      <div className={`box-border ${isMobile ? 'pb-16 px-2 w-full max-w-full' : 'px-6'}`}>
        {isMobile ? (
          <div className="w-full max-w-full min-w-0">
            <div className="w-full overflow-x-hidden">
              {activeTab === 'answer' && (
                <AnswerTab 
                  user={user} 
                  onRefreshUser={onRefreshUser}
                  systemConfig={systemConfig}
                />
              )}
              {activeTab === 'payment' && (
                <PaymentTab 
                  user={user}
                  paymentInstruction={systemConfig.payment_instruction}
                  paymentQrcode={systemConfig.payment_qrcode}
                />
              )}
              {activeTab === 'history' && (
                <HistoryTab user={user} />
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 左侧导航 (PC端显示) */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="text-lg">功能菜单</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <nav className="space-y-1">
                    <button
                      onClick={() => setActiveTab('answer')}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'answer' 
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Search className="h-4 w-4 mr-3" />
                      AI答题
                    </button>
                    <button
                      onClick={() => setActiveTab('payment')}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'payment' 
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <CreditCard className="h-4 w-4 mr-3" />
                      缴费充值
                    </button>
                    <button
                      onClick={() => setActiveTab('history')}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'history' 
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <History className="h-4 w-4 mr-3" />
                      使用记录
                    </button>
                  </nav>
                </CardContent>
              </Card>
            </div>

            {/* 右侧内容 */}
            <div className="lg:col-span-3">
              {activeTab === 'answer' && (
                <AnswerTab 
                  user={user} 
                  onRefreshUser={onRefreshUser}
                  systemConfig={systemConfig}
                />
              )}
              {activeTab === 'payment' && (
                <PaymentTab 
                  user={user}
                  paymentInstruction={systemConfig.payment_instruction}
                  paymentQrcode={systemConfig.payment_qrcode}
                />
              )}
              {activeTab === 'history' && (
                <HistoryTab user={user} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// AI答题标签页
// ============================================
function AnswerTab({ 
  user, 
  onRefreshUser,
  systemConfig
}: { 
  user: RegularUser
  onRefreshUser: () => void
  systemConfig: Record<string, string>
}) {
  const [searchText, setSearchText] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [showLimitDialog, setShowLimitDialog] = useState(false)
  const [expandedAnalysis, setExpandedAnalysis] = useState<Set<string>>(new Set())

  // 格式化解析内容，添加换行和分段
  const formatAnalysis = (text: string): React.ReactNode[] => {
    if (!text) return []
      
    // 方法：先按【标题】分割，再按选项字母分割
    const result: React.ReactNode[] = []
    
    // 将文本按【标题】分割成块
    const blocks = text.split(/（【|【/g)
    
    blocks.forEach((block, blockIndex) => {
      if (!block.trim()) return
      
      // 检查是否以】结束（说明这是一个标题）
      const titleMatch = block.match(/^([^】]*】)(.*)/s)
      
      if (titleMatch) {
        // 这是一个带标题的块
        const title = '【' + titleMatch[1]
        const content = titleMatch[2]
        
        // 添加标题
        result.push(
          <p key={`title-${blockIndex}`} className="font-bold text-blue-700 mt-2 mb-1">
            {title}
          </p>
        )
        
        // 处理内容部分
        if (content.trim()) {
          processContent(content, result, blockIndex)
        }
      } else {
        // 普通内容块
        processContent(block, result, blockIndex)
      }
    })
    
    return result
  }
  
  // 处理内容部分，按选项字母和正确答案分割
  const processContent = (content: string, result: React.ReactNode[], baseIndex: number) => {
    // 按选项字母分割
    const parts = content.split(/([A-F]\.\s)/g)
    
    parts.forEach((part, partIndex) => {
      if (!part.trim()) return
      
      // 如果是选项字母
      if (part.match(/^[A-F]\.\s$/)) {
        return // 选项字母会和后面的内容一起处理
      }
      
      // 检查是否以选项字母开头
      const optionMatch = part.match(/^([A-F]\.\s)(.*)/s)
      if (optionMatch) {
        // 选项行
        result.push(
          <p key={`opt-${baseIndex}-${partIndex}`} className="mb-1 leading-relaxed">
            <span className="font-bold text-gray-800">{optionMatch[1]}</span>
            <span>{optionMatch[2]}</span>
          </p>
        )
        return
      }
      
      // 检查是否包含正确答案
      const answerMatch = part.match(/(正确答案[：:].*)/s)
      if (answerMatch && part.indexOf(answerMatch[1]) > 0) {
        // 在正确答案前分割
        const beforeAnswer = part.substring(0, part.indexOf(answerMatch[1]))
        const answerText = answerMatch[1]
        
        if (beforeAnswer.trim()) {
          result.push(
            <p key={`before-${baseIndex}-${partIndex}`} className="mb-1 leading-relaxed">
              {beforeAnswer.trim()}
            </p>
          )
        }
        
        result.push(
          <p key={`answer-${baseIndex}-${partIndex}`} className="font-bold text-green-700 mt-1 mb-1">
            {answerText.trim()}
          </p>
        )
        return
      }
      
      // 如果是正确答案开头
      if (part.match(/^正确答案[：:]/)) {
        result.push(
          <p key={`ans-${baseIndex}-${partIndex}`} className="font-bold text-green-700 mt-1 mb-1">
            {part.trim()}
          </p>
        )
        return
      }
      
      // 普通内容
      result.push(
        <p key={`text-${baseIndex}-${partIndex}`} className="mb-1 leading-relaxed">
          {part.trim()}
        </p>
      )
    })
  }

  // 处理双引号内容为红色加粗
  const renderHintText = (text: string) => {
    const parts = text.split(/("[^"]*")/g)
    return parts.map((part, index) => {
      if (part.startsWith('"') && part.endsWith('"')) {
        // 去除双引号并显示红色加粗
        const content = part.slice(1, -1)
        return (
          <span key={index} className="text-red-600 font-bold">{content}</span>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  const handleSearch = async () => {
    if (user.available_questions <= 0) {
      setShowLimitDialog(true)
      return
    }

    if (!searchText.trim()) {
      toast.error('请输入题目内容')
      return
    }
    
    if (searchText.trim().length < 6) {
      toast.error('最少需要输入6个字')
      setSearchText('') // 自动清除少于6个字的内容
      return
    }
    
    setLoading(true)
    setHasSearched(true)
    
    try {
      // 调用搜索函数
      const { data, error } = await supabase
        .rpc('search_questions', { 
          search_text: searchText.trim(),
          max_results: 50
        })
      
      if (error) {
        // 如果RPC不存在，使用普通查询
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('questions')
          .select('*')
          .ilike('question_content', `%${searchText.trim()}%`)
          .limit(50)
        
        if (fallbackError) throw fallbackError
        
        if (fallbackData && fallbackData.length > 0) {
          setQuestions(fallbackData)
          
          // 1. 获取当前用户数据
          const { data: userData, error: userFetchError } = await supabase
            .from('regular_users')
            .select('available_questions')
            .eq('id', user.id)
            .single()
          
          if (userFetchError) throw userFetchError

          // 2. 扣减可用题数（前端计算叠加）
          const { error: deductError } = await supabase
            .from('regular_users')
            .update({ 
              available_questions: (userData.available_questions || 0) - 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
          
          if (deductError) throw deductError
          
          // 3. 记录使用
          await supabase.from('usage_records').insert([{
            user_id: user.id,
            phone: user.phone,
            search_content: searchText.trim(),
            matched_count: fallbackData.length,
            used_questions: 1
          }])
          
          onRefreshUser()
          toast.success(`找到 ${fallbackData.length} 道相关题目`)
        } else {
          // 未找到，尝试按标点分割搜索
          const result = await searchBySegments(searchText.trim())
          if (result && result.length > 0) {
            setQuestions(result)
            
            const { data: userData, error: userFetchError } = await supabase
              .from('regular_users')
              .select('available_questions')
              .eq('id', user.id)
              .single()
            
            if (userFetchError) throw userFetchError

            const { error: deductError } = await supabase
              .from('regular_users')
              .update({ 
                available_questions: (userData.available_questions || 0) - 1,
                updated_at: new Date().toISOString()
              })
              .eq('id', user.id)
            
            if (deductError) throw deductError
            
            await supabase.from('usage_records').insert([{
              user_id: user.id,
              phone: user.phone,
              search_content: searchText.trim(),
              matched_count: result.length,
              used_questions: 1
            }])
            
            onRefreshUser()
            toast.success(`找到 ${result.length} 道相关题目`)
          } else {
            setQuestions([])
            toast.info('未找到匹配的题目，请尝试减少字数或更换关键词')
          }
        }
      } else if (data && data.length > 0) {
        setQuestions(data)
        
        // 1. 获取当前用户数据
        const { data: userData, error: userFetchError } = await supabase
          .from('regular_users')
          .select('available_questions')
          .eq('id', user.id)
          .single()
        
        if (userFetchError) throw userFetchError

        // 2. 扣减可用题数（前端计算叠加）
        const { error: deductError } = await supabase
          .from('regular_users')
          .update({ 
            available_questions: (userData.available_questions || 0) - 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
        
        if (deductError) throw deductError
        
        // 3. 记录使用
        await supabase.from('usage_records').insert([{
          user_id: user.id,
          phone: user.phone,
          search_content: searchText.trim(),
          matched_count: data.length,
          used_questions: 1
        }])
        
        onRefreshUser()
        toast.success(`找到 ${data.length} 道相关题目`)
      } else {
        // 未找到，尝试按标点分割搜索
        const result = await searchBySegments(searchText.trim())
        if (result && result.length > 0) {
          setQuestions(result)
          
          const { data: userData, error: userFetchError } = await supabase
            .from('regular_users')
            .select('available_questions')
            .eq('id', user.id)
            .single()
          
          if (userFetchError) throw userFetchError

          const { error: deductError } = await supabase
            .from('regular_users')
            .update({ 
              available_questions: (userData.available_questions || 0) - 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
          
          if (deductError) throw deductError
          
          await supabase.from('usage_records').insert([{
            user_id: user.id,
            phone: user.phone,
            search_content: searchText.trim(),
            matched_count: result.length,
            used_questions: 1
          }])
          
          onRefreshUser()
          toast.success(`找到 ${result.length} 道相关题目`)
        } else {
          setQuestions([])
          toast.info('未找到匹配的题目，请尝试减少字数或更换关键词')
        }
      }
    } catch (e) {
      console.error('搜索失败:', e)
      toast.error('搜索失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  // 按标点分割搜索
  const searchBySegments = async (text: string): Promise<Question[]> => {
    // 标点符号正则：括号、句号、逗号、问号、感叹号等
    const punctuationRegex = /[，。、；：？！""''\(\)\(\)\[\]【】「」\{\}\s]+/
    
    // 分割文本段
    const segments = text.split(punctuationRegex).filter(s => s.trim().length >= 2)
    
    if (segments.length === 0) return []
    
    // 对每个段进行模糊搜索
    const questionMap: Map<string, { question: Question, matchedCount: number }> = new Map()
    
    for (const segment of segments) {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .ilike('question_content', `%${segment}%`)
        .limit(100)
      
      if (!error && data) {
        for (const q of data) {
          if (questionMap.has(q.id)) {
            const existing = questionMap.get(q.id)!
            existing.matchedCount++
          } else {
            questionMap.set(q.id, { question: q, matchedCount: 1 })
          }
        }
      }
    }
    
    // 转换为数组并按匹配段数降序排序
    const results = Array.from(questionMap.values())
      .sort((a, b) => b.matchedCount - a.matchedCount)
      .map(item => item.question)
    
    return results.slice(0, 50)
  }

  return (
    <div className="space-y-6">
      {/* 题目搜索区域 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">生成题目解析</CardTitle>
          <div className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded border border-blue-100">
            {renderHintText(systemConfig.answer_hint || '')}
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex flex-col gap-2">
            <Textarea
              placeholder="请输入题目内容连续文字，至少6个字"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="min-h-[80px] resize-none" 
              rows={3}
            />
            <Button onClick={handleSearch} disabled={loading} className="self-end">
              {loading ? 'AI生成中...' : '生成题目解析'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 次数不足弹窗 */}
      <AlertDialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <AlertDialogContent className="max-w-[90vw] rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>提示</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-900 font-medium">
              谢谢您的支持！您的使用次数已为0，请进入“缴费充值”，上传微信缴费转账截图后，才可继续使用！
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="w-full">好的，我知道了</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 搜索结果 */}
      {hasSearched && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>生成结果</CardTitle>
            <CardDescription>共生成 {questions.length} 道相关题目解析</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {questions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>抱歉，无法为您生成相关题目及解答</p>
                    <p className="text-sm">请准确输入题目内容或试下其它题目</p>
                  </div>
                ) : (
                  questions.map((q, index) => (
                    <div key={q.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="outline">{q.question_type}</Badge>
                        <Badge variant="secondary">{q.business_type}</Badge>
                      </div>
                      <p className="font-medium mb-3">{index + 1}. {q.question_content}</p>
                      <div className="space-y-1 text-sm">
                        {q.option_a && <p>A. {q.option_a}</p>}
                        {q.option_b && <p>B. {q.option_b}</p>}
                        {q.option_c && <p>C. {q.option_c}</p>}
                        {q.option_d && <p>D. {q.option_d}</p>}
                        {q.option_e && <p>E. {q.option_e}</p>}
                        {q.option_f && <p>F. {q.option_f}</p>}
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-green-600 font-medium">答案: {q.answer}</p>
                        {q.analysis && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => {
                                const newExpanded = new Set(expandedAnalysis)
                                if (newExpanded.has(q.id)) {
                                  newExpanded.delete(q.id)
                                } else {
                                  newExpanded.add(q.id)
                                }
                                setExpandedAnalysis(newExpanded)
                              }}
                            >
                              {expandedAnalysis.has(q.id) ? '收起解析 ▲' : '查看解析 ▼'}
                            </Button>
                            {expandedAnalysis.has(q.id) && (
                              <div className="mt-2 pt-2 border-t border-dashed border-gray-300">
                                <p className="text-sm font-medium text-blue-600 mb-1">解析：</p>
                                <div className="text-sm text-gray-700">
                                  {formatAnalysis(q.analysis)}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================
// 图片压缩函数
// ============================================
async function compressImage(file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        
        // 如果图片宽度超过最大值，等比例缩小
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
        
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        
        // 压缩为 JPEG，质量 0.7
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(compressedDataUrl)
      }
      img.onerror = reject
    }
    reader.onerror = reject
  })
}

// ============================================
// 缴费标签页
// ============================================
function PaymentTab({ 
  user, 
  paymentInstruction,
  paymentQrcode
}: { 
  user: RegularUser
  paymentInstruction: string
  paymentQrcode: string
}) {
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentImage, setPaymentImage] = useState<string>('')
  const [paymentImagePreview, setPaymentImagePreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [records, setRecords] = useState<PaymentRecord[]>([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [selectedProof, setSelectedProof] = useState<string | null>(null)

  // 加载缴费记录
  useEffect(() => {
    loadPaymentRecords()
  }, [user.id])

  const loadPaymentRecords = async () => {
    setLoadingRecords(true)
    
    try {
      // 优化点：列表仅查询元数据
      const fields = 'id, user_id, phone, payment_amount, upload_date, audit_status, audit_result, audit_remark, audited_amount, audit_date'
      
      const { data, error } = await supabase
        .from('payment_records')
        .select(fields)
        .eq('user_id', user.id)
        .order('upload_date', { ascending: false })
      
      if (error) throw error
      setRecords(data || [])
    } catch (e) {
      console.error('加载缴费记录失败:', e)
    } finally {
      setLoadingRecords(false)
    }
  }

  // 按需加载并查看凭证
  const handleViewProof = async (id: string) => {
    setSelectedProof('loading')
    
    try {
      const { data, error } = await supabase
        .from('payment_records')
        .select('payment_image_url')
        .eq('id', id)
        .single()
      
      if (error) throw error
      if (data) {
        setSelectedProof(data.payment_image_url)
      }
    } catch (e) {
      console.error('加载凭证失败:', e)
      toast.error('加载凭证失败')
      setSelectedProof(null)
    } finally {
      // 完成加载
    }
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件')
      return
    }
    
    // 检查原始文件大小（限制10MB）
    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过10MB')
      return
    }
    
    try {
      toast.info('正在压缩图片...')
      // 压缩图片，最大宽度800px，质量70%
      const compressedImage = await compressImage(file, 800, 0.7)
      
      // 计算压缩后大小（Base64字符串长度 * 0.75 约等于字节数）
      const compressedSize = Math.round(compressedImage.length * 0.75 / 1024)
      
      setPaymentImage(compressedImage)
      setPaymentImagePreview(compressedImage)
      toast.success(`图片压缩完成，约 ${compressedSize}KB`)
    } catch (e) {
      console.error('图片压缩失败:', e)
      toast.error('图片压缩失败，请重试')
    }
  }

  const handleUpload = async () => {
    // 移除 30-60 元的强制限制，只要大于 0 即可，方便测试或特殊调整
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('请输入有效的缴费金额')
      return
    }
    
    if (!paymentImage) {
      toast.error('请上传缴费凭证图片')
      return
    }

    setUploading(true)
    
    try {
      // 直接存储 Base64 字符串（与系统设置中的收款码存储逻辑保持一致，确保 100% 成功）
      const imageUrl = paymentImage
      
      // 创建缴费记录
      const { error: insertError } = await supabase
        .from('payment_records')
        .insert([{
          user_id: user.id,
          phone: user.phone,
          payment_image_url: imageUrl,
          payment_amount: parseFloat(paymentAmount),
          audit_status: '待审核'
        }])
      
      if (insertError) throw insertError
      
      toast.success('缴费记录上传成功，请等待审核')
      setPaymentAmount('')
      setPaymentImage('')
      setPaymentImagePreview('')
      // 强制刷新记录列表
      await loadPaymentRecords()
    } catch (e) {
      console.error('上传失败:', e)
      toast.error('上传失败，请稍后重试')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 缴费说明 */}
      <Card>
        <CardHeader>
          <CardTitle>缴费说明</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription className="whitespace-pre-line">
              {paymentInstruction}
            </AlertDescription>
          </Alert>
          
          {paymentQrcode && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500 mb-2">收款码</p>
              <img 
                src={paymentQrcode} 
                alt="收款码" 
                className="max-w-xs mx-auto border rounded-lg"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 上传缴费记录 */}
      <Card className="gap-0">
        <CardContent className="space-y-4">
          <CardTitle>上传缴费记录</CardTitle>
          <div>
            <Label className="mb-2 block">缴费金额（元）</Label>
            <Input
              type="number"
              placeholder="30-60元"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              min={30}
              max={60}
            />
          </div>
          
          <div>
            <Label className="mb-2 block">
              上传凭证：请上传微信付款凭证截图<br/>
              <span className="text-xs text-gray-500">（付款需留言备注用户手机号）</span>
            </Label>
            <div className="mt-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="payment-image"
              />
              <label htmlFor="payment-image">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors">
                  {paymentImagePreview ? (
                    <img 
                      src={paymentImagePreview} 
                      alt="预览" 
                      className="max-h-48 mx-auto"
                    />
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">点击上传缴费凭证</p>
                      <p className="text-xs text-gray-400">支持 JPG/PNG 格式，最大5MB</p>
                    </>
                  )}
                </div>
              </label>
            </div>
          </div>
          
          <Button 
            onClick={handleUpload} 
            disabled={uploading}
            className="w-full"
          >
            {uploading ? '上传中...' : '提交缴费记录'}
          </Button>
        </CardContent>
      </Card>

      {/* 历史缴费记录 */}
      <Card>
        <CardHeader>
          <CardTitle>历史缴费记录</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRecords ? (
            <p className="text-center py-4">加载中...</p>
          ) : records.length === 0 ? (
            <p className="text-center py-4 text-gray-500">暂无缴费记录</p>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <div key={record.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{record.payment_amount}元</p>
                      <p className="text-sm text-gray-500">{formatDate(record.upload_date)}</p>
                    </div>
                    <Badge 
                      variant={
                        record.audit_status === '已通过' ? 'default' :
                        record.audit_status === '已拒绝' ? 'destructive' :
                        'secondary'
                      }
                    >
                      {record.audit_status}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <div className="text-sm">
                      {record.audit_status !== '待审核' && (
                        <>
                          <p>审核金额: {record.audited_amount}元</p>
                          {record.audit_remark && (
                            <p className="text-gray-500">备注: {record.audit_remark}</p>
                          )}
                        </>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={() => handleViewProof(record.id)}
                    >
                      查看凭证
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 凭证预览弹窗 */}
      <Dialog open={!!selectedProof} onOpenChange={(open) => !open && setSelectedProof(null)}>
        <DialogContent className="max-w-[90vw] rounded-lg">
          <DialogHeader>
            <DialogTitle>缴费凭证</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {selectedProof === 'loading' ? (
              <div className="h-64 flex items-center justify-center">
                <p className="text-sm text-gray-500">凭证加载中...</p>
              </div>
            ) : selectedProof ? (
              <img 
                src={selectedProof} 
                alt="缴费凭证" 
                className="max-h-[70vh] w-auto border rounded-lg"
                onClick={() => {
                  const newWindow = window.open();
                  newWindow?.document.write(`<img src="${selectedProof}" style="max-width:100%;">`);
                }}
              />
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" className="w-full" onClick={() => setSelectedProof(null)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================
// 使用记录标签页
// ============================================
function HistoryTab({ user }: { user: RegularUser }) {
  const [records, setRecords] = useState<UsageRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    loadUsageRecords()
  }, [user.id])

  const loadUsageRecords = async () => {
    setLoading(true)
    setCurrentPage(1)
    
    try {
      const { data, error } = await supabase
        .from('usage_records')
        .select('*')
        .eq('user_id', user.id)
        .order('use_date', { ascending: false })
      
      if (error) throw error
      setRecords(data || [])
    } catch (e) {
      console.error('加载使用记录失败:', e)
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(records.length / pageSize)
  const paginatedRecords = records.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>使用记录</CardTitle>
            <CardDescription>
              您的历史使用记录
              {records.length > 0 && (
                <span className="ml-2 text-blue-600">共 {records.length} 次</span>
              )}
            </CardDescription>
          </div>
          
          {/* 分页控件 */}
          {totalPages > 1 && (
            <div className="flex items-center space-x-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                上一页
              </Button>
              <span className="text-sm text-gray-500 min-w-[60px] text-center">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                下一页
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center py-4">加载中...</p>
        ) : records.length === 0 ? (
          <p className="text-center py-4 text-gray-500">暂无使用记录</p>
        ) : (
          <div className="space-y-3">
            {paginatedRecords.map((record) => (
              <div key={record.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      搜索: {record.search_content}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(record.use_date)}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm">匹配 {record.matched_count} 题</p>
                    <p className="text-xs text-gray-500">使用 {record.used_questions} 题</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// 管理员视图
// ============================================
function AdminView({ 
  systemConfig,
  onConfigUpdate,
  adminUser
}: { 
  systemConfig: Record<string, string>
  onConfigUpdate: () => void
  adminUser: string | null
}) {
  const [activeTab, setActiveTab] = useState<'questions' | 'users' | 'payments' | 'stats' | 'settings'>('payments')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  // 双重监听：resize + matchMedia，确保DevTools设备切换时也能正确更新
  useEffect(() => {
    const updateMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    // 初始检查
    updateMobile()
    
    // resize 监听
    window.addEventListener('resize', updateMobile)
    
    // matchMedia 监听（DevTools设备模拟更可靠）
    const mediaQuery = window.matchMedia('(max-width: 767.98px)')
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
    }
    
    try {
      mediaQuery.addEventListener('change', handleMediaChange)
    } catch (e) {
      // 兼容旧浏览器
      mediaQuery.addListener(handleMediaChange)
    }
    
    return () => {
      window.removeEventListener('resize', updateMobile)
      try {
        mediaQuery.removeEventListener('change', handleMediaChange)
      } catch (e) {
        mediaQuery.removeListener(handleMediaChange)
      }
    }
  }, [])

  return (
    <div className="relative min-h-screen">
      {/* 移动端底部导航栏 */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-[9999]">
          <div className="flex justify-around items-center h-16">
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                activeTab === 'payments' ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <CreditCard className="h-5 w-5" />
              <span className="text-xs mt-1">缴费</span>
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                activeTab === 'questions' ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <BookOpen className="h-5 w-5" />
              <span className="text-xs mt-1">题库</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                activeTab === 'users' ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <Users className="h-5 w-5" />
              <span className="text-xs mt-1">用户</span>
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                activeTab === 'stats' ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <BarChart3 className="h-5 w-5" />
              <span className="text-xs mt-1">统计</span>
            </button>
            {/* 仅 admin 账号可见系统设置 */}
            {adminUser === 'admin' && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex flex-col items-center justify-center flex-1 h-full ${
                  activeTab === 'settings' ? 'text-blue-600' : 'text-gray-600'
                }`}
              >
                <Settings className="h-5 w-5" />
                <span className="text-xs mt-1">设置</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 主内容区域 */}
      <div className={`box-border ${isMobile ? 'pb-16 px-2 w-full max-w-full' : 'px-6'}`}>
        {isMobile ? (
          <div className="w-full max-w-full min-w-0">
            {activeTab === 'questions' && <AdminQuestionsTab />}
            {activeTab === 'users' && <AdminUsersTab />}
            {activeTab === 'payments' && <AdminPaymentsTab systemConfig={systemConfig} />}
            {activeTab === 'stats' && <AdminStatsTab />}
            {activeTab === 'settings' && (
              <AdminSettingsTab 
                systemConfig={systemConfig}
                onConfigUpdate={onConfigUpdate}
              />
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* 左侧导航 (PC端显示) */}
            <div className="md:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="text-lg">管理菜单</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <nav className="space-y-1">
                    <button
                      onClick={() => setActiveTab('payments')}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'payments' 
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <CreditCard className="h-4 w-4 mr-3" />
                      缴费管理
                    </button>
                    <button
                      onClick={() => setActiveTab('questions')}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'questions' 
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <BookOpen className="h-4 w-4 mr-3" />
                      题库管理
                    </button>
                    <button
                      onClick={() => setActiveTab('users')}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'users' 
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Users className="h-4 w-4 mr-3" />
                      用户管理
                    </button>
                    <button
                      onClick={() => setActiveTab('stats')}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'stats' 
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <BarChart3 className="h-4 w-4 mr-3" />
                      数据统计
                    </button>
                    {/* 仅 admin 账号可见系统设置 */}
                    {adminUser === 'admin' && (
                      <button
                        onClick={() => setActiveTab('settings')}
                        className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                          activeTab === 'settings' 
                            ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Settings className="h-4 w-4 mr-3" />
                        系统设置
                      </button>
                    )}
                  </nav>
                </CardContent>
              </Card>
            </div>

            {/* 右侧内容 */}
            <div className="md:col-span-3">
              {activeTab === 'questions' && <AdminQuestionsTab />}
              {activeTab === 'users' && <AdminUsersTab />}
              {activeTab === 'payments' && <AdminPaymentsTab systemConfig={systemConfig} />}
              {activeTab === 'stats' && <AdminStatsTab />}
              {activeTab === 'settings' && (
                <AdminSettingsTab 
                  systemConfig={systemConfig}
                  onConfigUpdate={onConfigUpdate}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// 管理员-题库管理
// ============================================
function AdminQuestionsTab() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [searchParams, setSearchParams] = useState({
    business_type: 'all',
    question_type: 'all',
    content: ''
  })
  
  // 分页状态
  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)
  const [totalCount, setTotalCount] = useState(0)

  const loadQuestions = async (p: number = 0) => {
    setLoading(true)
    
    try {
      let query = supabase.from('questions').select('*', { count: 'exact' })
      
      if (searchParams.business_type && searchParams.business_type !== 'all') {
        query = query.eq('business_type', searchParams.business_type)
      }
      if (searchParams.question_type && searchParams.question_type !== 'all') {
        query = query.eq('question_type', searchParams.question_type)
      }
      if (searchParams.content) {
        query = query.ilike('question_content', `%${searchParams.content}%`)
      }
      
      const { data, error, count } = await query
        .range(p * pageSize, (p + 1) * pageSize - 1)
      
      if (error) throw error
      setQuestions(data || [])
      setTotalCount(count || 0)
      setPage(p)
    } catch (e) {
      console.error('加载题库失败:', e)
      toast.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuestions(0)
  }, [])

  return (
    <Card className="w-full overflow-x-hidden pb-3" style={{ paddingTop: '0', gap: '0' }}>
      <div className="px-6 pt-0 pb-2">
        <div className="text-lg font-semibold">题库管理</div>
      </div>
      <CardContent className="px-4 py-3 pt-0">
        {/* 查询条件 - 移动端优化紧凑布局 */}
        <div className="space-y-2 mb-3">
          <div className="flex gap-2">
            <div className="flex items-center flex-1 min-w-0">
              <Label className="text-xs text-gray-500 shrink-0 mr-1">业态</Label>
              <Select 
                value={searchParams.business_type} 
                onValueChange={(v) => setSearchParams(p => ({ ...p, business_type: v }))}
              >
                <SelectTrigger className="h-8 text-sm w-full">
                  <SelectValue placeholder="选择业态类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="食品生产">食品生产</SelectItem>
                  <SelectItem value="食品流通">食品流通</SelectItem>
                  <SelectItem value="餐饮">餐饮</SelectItem>
                  <SelectItem value="特殊食品生产">特殊食品生产</SelectItem>
                  <SelectItem value="特殊食品流通">特殊食品流通</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center flex-1 min-w-0">
              <Label className="text-xs text-gray-500 shrink-0 mr-1">题型</Label>
              <Select 
                value={searchParams.question_type} 
                onValueChange={(v) => setSearchParams(p => ({ ...p, question_type: v }))}
              >
                <SelectTrigger className="h-8 text-sm w-full">
                  <SelectValue placeholder="选择题型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="单选题">单选题</SelectItem>
                  <SelectItem value="多选题">多选题</SelectItem>
                  <SelectItem value="判断题">判断题</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
                
          <div className="flex gap-2">
            <Input
              placeholder="题目内容模糊查找"
              value={searchParams.content}
              onChange={(e) => setSearchParams(p => ({ ...p, content: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && loadQuestions(0)}
              className="h-9 text-sm"
            />
            <Button size="sm" onClick={() => loadQuestions(0)} className="h-9 px-3">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 题目列表 */}
        {loading ? (
          <p className="text-center py-4">加载中...</p>
        ) : (
          <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
            <div>
              共 {totalCount} 条记录
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === 0}
                onClick={() => loadQuestions(page - 1)}
              >
                上一页
              </Button>
              <span>第 {page + 1} 页 / 共 {Math.ceil(totalCount / pageSize)} 页</span>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={(page + 1) * pageSize >= totalCount}
                onClick={() => loadQuestions(page + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
        
        <ScrollArea className="h-[50vh] sm:h-[600px]">
          <div className="space-y-3 sm:space-y-4">
            {questions.map((q) => (
              <div key={q.id} className="border rounded-lg p-3 bg-white shadow-sm break-words">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex gap-2">
                    <Badge variant="outline">{q.question_type}</Badge>
                    <Badge variant="secondary">{q.business_type}</Badge>
                  </div>
                </div>
                
                {/* 题目内容 */}
                <div className="mb-4">
                  <p className="font-medium text-gray-900">{q.question_content}</p>
                </div>

                {/* 选项列表 (如果有) */}
                {(q.option_a || q.option_b || q.option_c || q.option_d) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4 text-sm text-gray-600">
                    {q.option_a && <div className="flex gap-2"><span className="font-bold shrink-0">A.</span> {q.option_a}</div>}
                    {q.option_b && <div className="flex gap-2"><span className="font-bold shrink-0">B.</span> {q.option_b}</div>}
                    {q.option_c && <div className="flex gap-2"><span className="font-bold shrink-0">C.</span> {q.option_c}</div>}
                    {q.option_d && <div className="flex gap-2"><span className="font-bold shrink-0">D.</span> {q.option_d}</div>}
                    {q.option_e && <div className="flex gap-2"><span className="font-bold shrink-0">E.</span> {q.option_e}</div>}
                    {q.option_f && <div className="flex gap-2"><span className="font-bold shrink-0">F.</span> {q.option_f}</div>}
                  </div>
                )}

                {/* 答案 */}
                <div className="pt-3 border-t border-dashed flex items-center gap-2">
                  <span className="text-sm font-bold text-green-700">正确答案:</span>
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                    {q.answer}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// ============================================
// 管理员-用户管理
// ============================================
function AdminUsersTab() {
  const [users, setUsers] = useState<RegularUser[]>([])
  const [loading, setLoading] = useState(false)
  const [searchParams, setSearchParams] = useState({
    phone: '',
    city: 'all',
    status: 'all',
    startDate: '',
    endDate: ''
  })
  const [editingUser, setEditingUser] = useState<RegularUser | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const loadUsers = async () => {
    setLoading(true)
    
    try {
      let query = supabase.from('regular_users').select('*')
      
      if (searchParams.phone) {
        query = query.ilike('phone', `%${searchParams.phone}%`)
      }
      if (searchParams.city && searchParams.city !== 'all') {
        query = query.eq('city', searchParams.city)
      }
      if (searchParams.status && searchParams.status !== 'all') {
        query = query.eq('status', searchParams.status)
      }
      if (searchParams.startDate) {
        query = query.gte('created_at', `${searchParams.startDate}T00:00:00`)
      }
      if (searchParams.endDate) {
        query = query.lte('created_at', `${searchParams.endDate}T23:59:59`)
      }
      
      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (error) throw error
      setUsers(data || [])
    } catch (e) {
      console.error('加载用户失败:', e)
      toast.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleSaveUser = async () => {
    if (!supabase || !editingUser) return
    
    try {
      const { error } = await supabase
        .from('regular_users')
        .update({
          status: editingUser.status,
          available_questions: editingUser.available_questions,
          remark: editingUser.remark
        })
        .eq('id', editingUser.id)
      
      if (error) throw error
      
      toast.success('保存成功')
      setEditDialogOpen(false)
      loadUsers()
    } catch (e) {
      console.error('保存失败:', e)
      toast.error('保存失败')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>用户管理</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 查询条件 - 移动端优化紧凑布局 */}
        <div className="space-y-2 mb-4">
          <div className="flex gap-2">
            <Input
              placeholder="手机号"
              value={searchParams.phone}
              onChange={(e) => setSearchParams(p => ({ ...p, phone: e.target.value }))}
              className="h-8 text-sm flex-1"
            />
            <Select 
              value={searchParams.status} 
              onValueChange={(v) => setSearchParams(p => ({ ...p, status: v }))}
            >
              <SelectTrigger className="h-8 text-sm w-24 shrink-0">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="正常">正常</SelectItem>
                <SelectItem value="禁用">禁用</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={loadUsers} className="h-8 px-3 shrink-0">
              <Search className="h-4 w-4 mr-1" />
              查询
            </Button>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center flex-1 min-w-0">
              <Select 
                value={searchParams.city} 
                onValueChange={(v) => setSearchParams(p => ({ ...p, city: v }))}
              >
                <SelectTrigger className="h-8 text-sm w-full">
                  <SelectValue placeholder="选择市" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {Object.keys(FUJIAN_CITIES).map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center flex-1 min-w-0">
              <Label className="text-xs text-gray-500 shrink-0 mr-1">从</Label>
              <Input
                type="date"
                value={searchParams.startDate}
                onChange={(e) => setSearchParams(p => ({ ...p, startDate: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex items-center flex-1 min-w-0">
              <Label className="text-xs text-gray-500 shrink-0 mr-1">至</Label>
              <Input
                type="date"
                value={searchParams.endDate}
                onChange={(e) => setSearchParams(p => ({ ...p, endDate: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        {/* 用户列表 - 移动端卡片布局 */}
        {loading ? (
          <p className="text-center py-4">加载中...</p>
        ) : users.length === 0 ? (
          <p className="text-center py-4 text-gray-500">暂无用户</p>
        ) : (
          <>
            <div className="text-sm text-gray-500 mb-2">
              共 {users.length} 位用户
            </div>
            
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="border rounded-lg p-2.5">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{u.phone}</p>
                      <Badge variant={u.status === '正常' ? 'default' : 'destructive'} className="text-xs px-1.5 py-0 h-5">
                        {u.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400">{u.city} {u.district}</p>
                  </div>
                  <div className="flex gap-3 text-xs mb-1.5">
                    <div className="flex items-center">
                      <span className="text-gray-500">题数:</span>
                      <span className="ml-1 font-medium">{u.available_questions}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-500">缴费:</span>
                      <span className="ml-1 font-medium">¥{u.total_payment_amount}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-500">次数:</span>
                      <span className="ml-1">{u.valid_payment_count}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs mb-2">
                    <div className="flex items-center">
                      <span className="text-gray-500">最后缴费:</span>
                      <span className="ml-1">{formatDateOnly(u.last_payment_date || '')}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-500">注册:</span>
                      <span className="ml-1">{formatDateOnly(u.created_at || '')}</span>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full h-7 text-xs px-2"
                    onClick={() => {
                      setEditingUser(u)
                      setEditDialogOpen(true)
                    }}
                  >
                    <Edit className="h-3 w-3 mr-1" /> 编辑
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label>手机号</Label>
                <Input value={editingUser.phone} disabled />
              </div>
              <div>
                <Label>可用题数</Label>
                <Input 
                  type="number"
                  value={editingUser.available_questions}
                  onChange={(e) => setEditingUser({
                    ...editingUser,
                    available_questions: parseInt(e.target.value) || 0
                  })}
                />
              </div>
              <div>
                <Label>状态</Label>
                <Select 
                  value={editingUser.status}
                  onValueChange={(v: '正常' | '禁用') => setEditingUser({
                    ...editingUser,
                    status: v
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="正常">正常</SelectItem>
                    <SelectItem value="禁用">禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>备注</Label>
                <Textarea
                  value={editingUser.remark || ''}
                  onChange={(e) => setEditingUser({
                    ...editingUser,
                    remark: e.target.value
                  })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveUser}>
              <Save className="h-4 w-4 mr-1" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ============================================
// 管理员-缴费管理
// ============================================
function AdminPaymentsTab({ systemConfig }: { systemConfig: Record<string, string> }) {
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null)
  const [auditDialogOpen, setAuditDialogOpen] = useState(false)
  const [loadingImage, setLoadingImage] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  
  // 分页状态
  const [page, setPage] = useState(0)
  const [pageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)

  const [searchParams, setSearchParams] = useState({
    phone: '',
    startDate: '',
    endDate: ''
  })
  const [auditForm, setAuditForm] = useState({
    result: '已通过' as '已通过' | '已拒绝',
    amount: '',
    remark: ''
  })

  const loadPayments = async (p: number = 0) => {
    setLoading(true)
    
    try {
      // 优化点：不再直接查询 *，而是排除掉巨大的图片字段，仅查询元数据
      const fields = 'id, user_id, phone, payment_amount, upload_date, audit_status, audit_result, audit_remark, audited_amount, audit_date'
      
      let query = supabase
        .from('payment_records')
        .select(fields, { count: 'exact' })
      
      if (searchParams.phone) {
        query = query.ilike('phone', `%${searchParams.phone}%`)
      }
      if (searchParams.startDate) {
        query = query.gte('upload_date', `${searchParams.startDate}T00:00:00`)
      }
      if (searchParams.endDate) {
        query = query.lte('upload_date', `${searchParams.endDate}T23:59:59`)
      }

      // 优化点：强制按日期时间倒序排序
      const { data, error, count } = await query
        .order('upload_date', { ascending: false })
        .range(p * pageSize, (p + 1) * pageSize - 1)
      
      if (error) throw error
      setPayments(data || [])
      setTotalCount(count || 0)
      setPage(p)
    } catch (e) {
      console.error('加载缴费记录失败:', e)
      toast.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  // 点击查看凭证时，才按需加载图片内容
  const handleViewProof = async (payment: PaymentRecord) => {
    setSelectedPayment(payment)
    setLoadingImage(true)

    try {
      const { data, error } = await supabase
        .from('payment_records')
        .select('payment_image_url')
        .eq('id', payment.id)
        .single()
      
      if (error) throw error
      if (data && data.payment_image_url) {
        setPreviewImage(data.payment_image_url)
      }
    } catch (e) {
      console.error('加载图片失败:', e)
      toast.error('图片加载失败')
    } finally {
      setLoadingImage(false)
    }
  }

  // 点击审核时，加载完整记录
  const handleViewDetail = async (payment: PaymentRecord) => {
    setSelectedPayment(payment)
    setAuditForm({
      result: (payment.audit_status === '待审核' ? '已通过' : payment.audit_status) as '已通过' | '已拒绝',
      amount: (payment.audited_amount || payment.payment_amount).toString(),
      remark: payment.audit_remark || ''
    })
    setAuditDialogOpen(true)
    setLoadingImage(true)

    try {
      const { data, error } = await supabase
        .from('payment_records')
        .select('payment_image_url')
        .eq('id', payment.id)
        .single()
      
      if (error) throw error
      if (data) {
        setSelectedPayment(prev => prev ? { ...prev, payment_image_url: data.payment_image_url } : null)
      }
    } catch (e) {
      console.error('加载图片失败:', e)
      toast.error('图片加载失败')
    } finally {
      setLoadingImage(false)
    }
  }

  useEffect(() => {
    loadPayments(0)
  }, [])

  const handleAudit = async () => {
    if (!supabase || !selectedPayment) return
    
    const auditedAmount = parseFloat(auditForm.amount) || selectedPayment.payment_amount
    
    try {
      // 1. 更新缴费记录表
      const { error: updatePaymentError } = await supabase
        .from('payment_records')
        .update({
          audit_status: auditForm.result,
          audit_result: auditForm.result,
          audit_remark: auditForm.remark,
          audited_amount: auditedAmount,
          payment_amount: auditedAmount, // 同步更新原始金额，确保列表显示一致
          audit_date: new Date().toISOString()
        })
        .eq('id', selectedPayment.id)
      
      if (updatePaymentError) throw updatePaymentError
      
      // 2. 如果审核通过，更新用户表（叠加数据）
      if (auditForm.result === '已通过') {
        // 先获取当前用户数据
        const { data: userData, error: userFetchError } = await supabase
          .from('regular_users')
          .select('available_questions, total_payment_amount, valid_payment_count')
          .eq('id', selectedPayment.user_id)
          .single()
        
        if (userFetchError) throw userFetchError

        const newAvailableQuestions = (userData.available_questions || 0) + Math.round(auditedAmount * parseFloat(systemConfig.questions_per_yuan || '2'))
        const newTotalAmount = (userData.total_payment_amount || 0) + auditedAmount
        const newValidCount = (userData.valid_payment_count || 0) + 1

        const { error: userUpdateError } = await supabase
          .from('regular_users')
          .update({
            available_questions: newAvailableQuestions,
            total_payment_amount: newTotalAmount,
            valid_payment_count: newValidCount,
            last_payment_date: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedPayment.user_id)
        
        if (userUpdateError) throw userUpdateError
      }
      
      toast.success('审核完成')
      setAuditDialogOpen(false)
      loadPayments()
    } catch (e) {
      console.error('审核失败:', e)
      toast.error('审核失败')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>缴费管理</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 查询条件 - 移动端优化紧凑布局 */}
        <div className="space-y-2 mb-4">
          <div className="flex gap-2">
            <Input
              placeholder="手机号"
              value={searchParams.phone}
              onChange={(e) => setSearchParams(p => ({ ...p, phone: e.target.value }))}
              className="h-8 text-sm flex-1"
            />
            <Button size="sm" onClick={() => loadPayments(0)} className="h-8 px-3 shrink-0">
              <Search className="h-4 w-4 mr-1" />
              查询
            </Button>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center flex-1 min-w-0">
              <Label className="text-xs text-gray-500 shrink-0 mr-1">从</Label>
              <Input
                type="date"
                value={searchParams.startDate}
                onChange={(e) => setSearchParams(p => ({ ...p, startDate: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex items-center flex-1 min-w-0">
              <Label className="text-xs text-gray-500 shrink-0 mr-1">至</Label>
              <Input
                type="date"
                value={searchParams.endDate}
                onChange={(e) => setSearchParams(p => ({ ...p, endDate: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        {/* 记录列表 - 移动端卡片布局 */}
        {loading ? (
          <p className="text-center py-4">加载中...</p>
        ) : payments.length === 0 ? (
          <p className="text-center py-4 text-gray-500">暂无缴费记录</p>
        ) : (
          <>
            <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
              <div>
                共 {totalCount} 条记录
                {payments.filter(p => p.audit_status === '待审核').length > 0 && (
                  <span className="text-red-500 ml-2">
                    (本页待审核: {payments.filter(p => p.audit_status === '待审核').length})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page === 0}
                  onClick={() => loadPayments(page - 1)}
                >
                  上一页
                </Button>
                <span>第 {page + 1} 页 / 共 {Math.ceil(totalCount / pageSize)} 页</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={(page + 1) * pageSize >= totalCount}
                  onClick={() => loadPayments(page + 1)}
                >
                  下一页
                </Button>
              </div>
            </div>
            
            <div className="space-y-3">
              {payments.map((p) => (
                <div key={p.id} className={`border rounded-lg p-3 ${p.audit_status === '待审核' ? 'bg-red-50' : ''}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-sm">{p.phone}</p>
                      <p className="text-sm text-gray-500">¥{p.payment_amount}</p>
                      <p className="text-xs text-gray-400">{formatDate(p.upload_date)}</p>
                    </div>
                    <Badge 
                      variant={
                        p.audit_status === '已通过' ? 'default' :
                        p.audit_status === '已拒绝' ? 'destructive' :
                        'secondary'
                      }
                      className="shrink-0"
                    >
                      {p.audit_status}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={() => handleViewDetail(p)}
                    >
                      {p.audit_status === '待审核' ? (
                        <><CheckCircle className="h-3 w-3 mr-1" /> 审核</>
                      ) : (
                        <><Eye className="h-3 w-3 mr-1" /> 查看</>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={() => handleViewProof(p)}
                    >
                      <Eye className="h-3 w-3 mr-1" /> 凭证
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>

      {/* 审核对话框 */}
      <Dialog open={auditDialogOpen} onOpenChange={setAuditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>审核缴费记录</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div>
                <Label>用户申报金额</Label>
                <Input value={`¥${selectedPayment.payment_amount}`} disabled />
              </div>
              <div>
                <Label>审核金额</Label>
                <Input 
                  type="number"
                  value={auditForm.amount}
                  onChange={(e) => setAuditForm({ ...auditForm, amount: e.target.value })}
                />
              </div>
              <div>
                <Label>审核结果</Label>
                <Select 
                  disabled={selectedPayment.audit_status !== '待审核'}
                  value={auditForm.result}
                  onValueChange={(v: string) => setAuditForm({ ...auditForm, result: v as '已通过' | '已拒绝' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="已通过">审核通过</SelectItem>
                    <SelectItem value="已拒绝">审核拒绝</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>审核说明</Label>
                <Textarea
                  disabled={selectedPayment.audit_status !== '待审核'}
                  value={auditForm.remark}
                  onChange={(e) => setAuditForm({ ...auditForm, remark: e.target.value })}
                  placeholder="请输入审核说明（可选）"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuditDialogOpen(false)}>
              {selectedPayment?.audit_status === '待审核' ? '取消' : '关闭'}
            </Button>
            {selectedPayment?.audit_status === '待审核' && (
              <Button onClick={handleAudit}>
                <Save className="h-4 w-4 mr-1" />
                确认审核
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 凭证图片查看对话框 */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>缴费凭证</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-4">
            {loadingImage ? (
              <p className="text-gray-500">图片加载中...</p>
            ) : previewImage ? (
              <img 
                src={previewImage} 
                alt="缴费凭证" 
                className="max-w-full max-h-[70vh] object-contain"
              />
            ) : (
              <p className="text-gray-500">暂无凭证图片</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setPreviewImage(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ============================================
// 管理员-数据统计
// ============================================
function AdminStatsTab() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPayments: 0,
    totalAmount: 0,
    todayUsage: 0
  })
  const [loading, setLoading] = useState(false)
  const [searchParams, setSearchParams] = useState({
    startDate: '2026-01-01',
    endDate: '2026-12-31'
  })
  const [cityStats, setCityStats] = useState<any[]>([])
  const [summary, setSummary] = useState({
    newUsers: 0,
    payments: 0,
    amount: 0,
    usage: 0
  })

  useEffect(() => {
    loadStats()
    loadCityStats()
  }, [])

  const loadStats = async () => {
    try {
      // 用户总数
      const { count: userCount } = await supabase
        .from('regular_users')
        .select('*', { count: 'exact', head: true })
      
      // 缴费统计
      const { data: paymentData } = await supabase
        .from('payment_records')
        .select('audited_amount')
        .eq('audit_status', '已通过')
      
      const totalAmount = paymentData?.reduce((sum, p) => sum + (p.audited_amount || 0), 0) || 0
      
      // 总使用次数
      const { count: usageCount } = await supabase
        .from('usage_records')
        .select('*', { count: 'exact', head: true })
      
      setStats({
        totalUsers: userCount || 0,
        totalPayments: paymentData?.length || 0,
        totalAmount,
        todayUsage: usageCount || 0
      })
    } catch (e) {
      console.error('加载统计失败:', e)
    }
  }

  const loadCityStats = async () => {
    setLoading(true)
    try {
      const start = `${searchParams.startDate}T00:00:00`
      const end = `${searchParams.endDate}T23:59:59`

      // 1. 获取新注册用户按城市统计
      const { data: newUsersData } = await supabase
        .from('regular_users')
        .select('city')
        .gte('created_at', start)
        .lte('created_at', end)

      // 2. 获取缴费记录按城市统计
      const { data: paymentsData } = await supabase
        .from('payment_records')
        .select('phone, audited_amount')
        .eq('audit_status', '已通过')
        .gte('audit_date', start)
        .lte('audit_date', end)

      // 3. 获取使用记录按城市统计
      const { data: usageData } = await supabase
        .from('usage_records')
        .select('phone')
        .gte('use_date', start)
        .lte('use_date', end)

      // 4. 获取所有用户手机号对应的城市映射（用于统计缴费和使用次数）
      const { data: userCityMap } = await supabase
        .from('regular_users')
        .select('phone, city')

      const phoneToCity: Record<string, string> = {}
      userCityMap?.forEach(u => { phoneToCity[u.phone] = u.city })

      // 5. 整合 10 个地市数据
      const cities = Object.keys(FUJIAN_CITIES)
      const result = cities.map(city => {
        const cityNewUsers = newUsersData?.filter(u => u.city === city).length || 0
        
        const cityPayments = paymentsData?.filter(p => phoneToCity[p.phone] === city) || []
        const cityPaymentCount = cityPayments.length
        const cityAmount = cityPayments.reduce((sum, p) => sum + (p.audited_amount || 0), 0)
        
        const cityUsageCount = usageData?.filter(u => phoneToCity[u.phone] === city).length || 0

        return {
          city,
          newUsers: cityNewUsers,
          payments: cityPaymentCount,
          amount: cityAmount,
          usage: cityUsageCount
        }
      })

      setCityStats(result)
      setSummary({
        newUsers: result.reduce((sum, c) => sum + c.newUsers, 0),
        payments: result.reduce((sum, c) => sum + c.payments, 0),
        amount: result.reduce((sum, c) => sum + c.amount, 0),
        usage: result.reduce((sum, c) => sum + c.usage, 0)
      })
    } catch (e) {
      console.error('加载地市统计失败:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* 顶部总计 - 横向一行，金额列加宽 */}
      <div className="bg-white rounded-lg border p-2">
        <div className="flex gap-2 text-xs">
          <div className="flex-[0.8] text-center border-r border-gray-200">
            <p className="text-gray-500 mb-0.5">用户总数</p>
            <p className="font-bold">{stats.totalUsers}</p>
          </div>
          <div className="flex-[0.8] text-center border-r border-gray-200">
            <p className="text-gray-500 mb-0.5">缴费次数</p>
            <p className="font-bold">{stats.totalPayments}</p>
          </div>
          <div className="flex-[2] text-center border-r border-gray-200">
            <p className="text-gray-500 mb-0.5">累计缴费金额</p>
            <p className="font-bold">¥{stats.totalAmount.toFixed(2)}</p>
          </div>
          <div className="flex-[0.8] text-center">
            <p className="text-gray-500 mb-0.5">使用次数</p>
            <p className="font-bold">{stats.todayUsage}</p>
          </div>
        </div>
      </div>

      {/* 地市详情统计 */}
      <div className="bg-white rounded-lg border">
        <div className="p-3 border-b">
          <h3 className="text-base font-semibold">地市明细统计</h3>
        </div>
        <div className="p-3">
          {/* 查询工具栏 */}
          <div className="flex gap-2 items-center mb-3">
            <Input 
              type="date" 
              value={searchParams.startDate}
              onChange={(e) => setSearchParams(p => ({ ...p, startDate: e.target.value }))}
              className="h-8 text-sm flex-1"
            />
            <span className="text-gray-500 text-sm shrink-0">-</span>
            <Input 
              type="date" 
              value={searchParams.endDate}
              onChange={(e) => setSearchParams(p => ({ ...p, endDate: e.target.value }))}
              className="h-8 text-sm flex-1"
            />
            <Button size="sm" onClick={loadCityStats} disabled={loading} className="h-8 px-2 shrink-0">
              <BarChart3 className="h-3 w-3" />
            </Button>
          </div>

          {/* 期间汇总数据 - 横向一行，金额列加宽 */}
          <div className="flex gap-2 mb-3 p-2 bg-gray-50 rounded border text-xs">
            <div className="flex-1 text-center border-r border-gray-200">
              <p className="text-gray-500 mb-0.5">新用户</p>
              <p className="font-bold text-blue-600">{summary.newUsers}</p>
            </div>
            <div className="flex-1 text-center border-r border-gray-200">
              <p className="text-gray-500 mb-0.5">缴费次数</p>
              <p className="font-bold text-green-600">{summary.payments}</p>
            </div>
            <div className="flex-[2] text-center border-r border-gray-200">
              <p className="text-gray-500 mb-0.5">总金额</p>
              <p className="font-bold text-orange-600">¥{summary.amount.toFixed(2)}</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-gray-500 mb-0.5">使用次数</p>
              <p className="font-bold text-purple-600">{summary.usage}</p>
            </div>
          </div>

          {/* 地市列表 - 使用div布局确保手机端完美显示 */}
          <div>
            {/* 表头 */}
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', padding: '10px 8px' }}>
              <div style={{ flex: '2', fontWeight: 500, color: '#374151', fontSize: '13px' }}>地市</div>
              <div style={{ flex: '1', textAlign: 'right', fontWeight: 500, color: '#374151', fontSize: '13px' }}>新用户</div>
              <div style={{ flex: '1', textAlign: 'right', fontWeight: 500, color: '#374151', fontSize: '13px' }}>缴费</div>
              <div style={{ flex: '1.2', textAlign: 'right', fontWeight: 500, color: '#374151', fontSize: '13px' }}>金额</div>
              <div style={{ flex: '1', textAlign: 'right', fontWeight: 500, color: '#374151', fontSize: '13px' }}>使用</div>
            </div>
            
            {/* 数据行 */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '32px 8px', color: '#6b7280', fontSize: '14px' }}>加载中...</div>
            ) : cityStats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 8px', color: '#6b7280', fontSize: '14px' }}>暂无数据</div>
            ) : cityStats.map((item, idx) => (
              <div key={item.city} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                borderBottom: '1px solid #f3f4f6',
                padding: '10px 8px'
              }}>
                <div style={{ flex: '2', fontSize: '13px', fontWeight: 500 }}>{item.city}</div>
                <div style={{ flex: '1', textAlign: 'right', fontSize: '13px' }}>{item.newUsers}</div>
                <div style={{ flex: '1', textAlign: 'right', fontSize: '13px' }}>{item.payments}</div>
                <div style={{ flex: '1.2', textAlign: 'right', fontSize: '13px' }}>¥{item.amount.toFixed(2)}</div>
                <div style={{ flex: '1', textAlign: 'right', fontSize: '13px' }}>{item.usage}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// 管理员-系统设置
// ============================================
function AdminSettingsTab({ 
  systemConfig,
  onConfigUpdate 
}: { 
  systemConfig: Record<string, string>
  onConfigUpdate: () => void
}) {
  const [systemName, setSystemName] = useState(systemConfig.system_name || '食安AI学习答题助手')
  const [paymentInstruction, setPaymentInstruction] = useState(systemConfig.payment_instruction)
  const [answerHint, setAnswerHint] = useState(systemConfig.answer_hint)
  const [qrcodePreview, setQrcodePreview] = useState(systemConfig.payment_qrcode)
  const [questionsPerYuan, setQuestionsPerYuan] = useState(systemConfig.questions_per_yuan || '2')
  const [saving, setSaving] = useState(false)

  const handleQrcodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件')
      return
    }
    
    try {
      toast.info('正在压缩图片...')
      // 压缩收款码图片，最大宽度600px，质量80%
      const compressedImage = await compressImage(file, 600, 0.8)
      const compressedSize = Math.round(compressedImage.length * 0.75 / 1024)
      
      setQrcodePreview(compressedImage)
      toast.success(`图片压缩完成，约 ${compressedSize}KB`)
    } catch (e) {
      console.error('图片压缩失败:', e)
      toast.error('图片压缩失败')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    
    try {
      // 直接使用预览图（已经是压缩后的 Base64）
      const qrcodeUrl = qrcodePreview
      
      // 更新配置
      const configs = [
        { key: 'system_name', value: systemName },
        { key: 'payment_instruction', value: paymentInstruction },
        { key: 'answer_hint', value: answerHint },
        { key: 'payment_qrcode', value: qrcodeUrl },
        { key: 'questions_per_yuan', value: questionsPerYuan }
      ]
      
      for (const config of configs) {
        const { error } = await supabase
          .from('system_config')
          .upsert({
            config_key: config.key,
            config_value: config.value,
            config_type: config.key === 'payment_qrcode' ? 'image' : 'text'
          }, { onConflict: 'config_key' })
        
        if (error) throw error
      }
      
      toast.success('保存成功')
      // 重新从数据库获取最新配置
      await onConfigUpdate()
    } catch (e) {
      console.error('保存失败:', e)
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>系统设置</CardTitle>
        <CardDescription>配置系统参数</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>系统名称</Label>
          <Input
            value={systemName}
            onChange={(e) => setSystemName(e.target.value)}
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">显示在页面顶部的系统名称</p>
        </div>
        
        <div>
          <Label>题目数/元</Label>
          <Input
            type="number"
            value={questionsPerYuan}
            onChange={(e) => setQuestionsPerYuan(e.target.value)}
            min={0.5}
            step={0.1}
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">每1元可获得的题目数，支持小数，计算时四舍五入</p>
        </div>
        
        <div>
          <Label>缴费说明</Label>
          <Textarea
            value={paymentInstruction}
            onChange={(e) => setPaymentInstruction(e.target.value)}
            rows={4}
            className="mt-1"
          />
        </div>
        
        <div>
          <Label>答题提示信息</Label>
          <Textarea
            value={answerHint}
            onChange={(e) => setAnswerHint(e.target.value)}
            rows={4}
            className="mt-1"
          />
        </div>
        
        <div>
          <Label>收款码</Label>
          <div className="mt-2">
            <Input
              type="file"
              accept="image/*"
              onChange={handleQrcodeChange}
              className="hidden"
              id="qrcode-image"
            />
            <label htmlFor="qrcode-image">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors max-w-xs">
                {qrcodePreview ? (
                  <img 
                    src={qrcodePreview} 
                    alt="收款码" 
                    className="max-h-48 mx-auto"
                  />
                ) : (
                  <>
                    <ImageIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">点击上传收款码</p>
                  </>
                )}
              </div>
            </label>
          </div>
        </div>
        
        <Button onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '保存设置'}
        </Button>
      </CardContent>
    </Card>
  )
}

export default App
