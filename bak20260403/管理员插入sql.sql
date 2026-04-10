-- 插入普通管理员账号 (示例密码均为: 123456)
-- 你可以根据需要自行修改 username 和 password_hash
INSERT INTO public.admins (username, password_hash)
VALUES 
    ('auditor01', '123456'),
    ('auditor02', '123456');

INSERT INTO public.admins (username, password_hash)
VALUES 
    ('xtgly', 'saks-gl');