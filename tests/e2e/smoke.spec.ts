import { test,expect } from '@playwright/test';

test.describe('Public routes and unauthenticated API boundary',()=>{
  test('supports school-qualified student identifiers without posting credentials',async({page})=>{
    await page.goto('/login');
    await expect(page.getByRole('heading',{name:'EduSchool LMS'})).toBeVisible();
    const identifier=page.getByLabel('Tài khoản',{exact:true});
    await identifier.fill('THPT-DEMO:HS001');
    await expect(identifier).toHaveAttribute('type','text');
    await expect(page.getByRole('button',{name:'Đăng nhập',exact:true})).toBeVisible();
  });
  test('redirects a protected portal to login',async({page})=>{
    await page.goto('/student');
    await expect(page).toHaveURL(/\/login/);
  });
  test('does not expose a session without authentication',async({request})=>{
    const response=await request.get('/api/v1/session');
    expect(response.status()).toBe(401);
    expect(response.headers()['cache-control']).toContain('no-store');
    expect((await response.json()).error.code).toBe('UNAUTHENTICATED');
  });
  test('keeps login usable on a narrow screen',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await page.goto('/login');
    await expect(page.getByLabel('Tài khoản',{exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  });
  test('serves a liveness endpoint without exposing infrastructure details',async({request})=>{
    const response=await request.get('/api/health');
    expect(response.ok()).toBe(true);expect(await response.json()).toEqual({status:'ok'});
  });
});
