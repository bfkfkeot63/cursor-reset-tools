import crypto from 'crypto';
import express from 'express';
import fetch from 'node-fetch';
import UserAgent from 'user-agents';

const rt = express.Router();

const ab = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const cd = (plainPassword) => {
  return crypto.createHash('sha256').update(plainPassword).digest('hex');
};

const ef = async (username, plainPassword, name) => {
  const userAgent = new UserAgent({ deviceCategory: 'mobile' }).toString();
  const password = cd(plainPassword);
  
  try {
    const checkResponse = await fetch('https://api.atomicmail.io/v1/auth/sign-up/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
        'Origin': 'https://atomicmail.io',
        'Referer': 'https://atomicmail.io/',
      },
      body: JSON.stringify({ username })
    });
    
    const checkData = await checkResponse.json();
    
    if (!checkData.success) {
      return null;
    }
    
    const seedPhrase = crypto.randomBytes(32).toString('hex');
    const publicKey = `0x${crypto.createHash('sha256').update(seedPhrase).digest('hex').substring(0, 64)}`;
    const encryptedSeedPhrase = `${crypto.randomBytes(8).toString('hex')}:${crypto.randomBytes(64).toString('hex')}`;
    
    const signUpResponse = await fetch('https://api.atomicmail.io/v1/auth/sign-up', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
        'Origin': 'https://atomicmail.io',
        'Referer': 'https://atomicmail.io/',
        'Authorization': 'Bearer null'
      },
      body: JSON.stringify({
        name,
        username,
        password,
        publicKey,
        encryptedSeedPhrase
      })
    });
    
    const signUpData = await signUpResponse.json();
    
    if (signUpData.success) {
      return {
        ...signUpData.results,
        plainPassword
      };
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
};

const uv = async (username) => {
  const userAgent = new UserAgent({ deviceCategory: 'mobile' }).toString();
  
  try {
    await fetch('https://umami.atomicmail.io/api/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
        'Origin': 'https://atomicmail.io',
        'Referer': 'https://atomicmail.io/',
        'Sec-Ch-Ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
        'Sec-Ch-Ua-Mobile': '?1',
        'Sec-Ch-Ua-Platform': '"Android"'
      },
      body: JSON.stringify({
        type: 'event',
        payload: {
          website: '0209f0b8-619a-4bb4-bfe4-6fd053cad79d',
          screen: '412x915',
          language: 'en',
          hostname: 'atomicmail.io',
          url: 'https://atomicmail.io/app/auth/sign-in',
          title: 'Atomic Mail',
          referrer: ''
        }
      })
    });
    
    return true;
  } catch (error) {
    return false;
  }
};

const yz = async (token) => {
  const userAgent = new UserAgent({ deviceCategory: 'mobile' }).toString();
  
  try {
    await fetch('https://api.atomicmail.io/v1/users/activity', {
      method: 'POST',
      headers: {
        'User-Agent': userAgent,
        'Origin': 'https://atomicmail.io',
        'Referer': 'https://atomicmail.io/',
        'Authorization': `Bearer ${token}`,
        'Sec-Ch-Ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
        'Sec-Ch-Ua-Mobile': '?1',
        'Sec-Ch-Ua-Platform': '"Android"',
        'Accept-Language': 'en'
      },
      body: ''
    });
    
    return true;
  } catch (error) {
    return false;
  }
};

const bc = async (token) => {
  const userAgent = new UserAgent({ deviceCategory: 'mobile' }).toString();
  
  try {
    const profileResponse = await fetch('https://api.atomicmail.io/v1/users/profile', {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        'Origin': 'https://atomicmail.io',
        'Referer': 'https://atomicmail.io/',
        'Authorization': `Bearer ${token}`,
        'Sec-Ch-Ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
        'Sec-Ch-Ua-Mobile': '?1',
        'Sec-Ch-Ua-Platform': '"Android"',
        'Accept-Language': 'en',
        'Cache-Control': 'max-age=0'
      }
    });
    
    const profileData = await profileResponse.json();
    
    if (profileData.success) {
      return {
        id: profileData.id,
        username: profileData.username,
        address: profileData.address
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

const de = async (token) => {
  const userAgent = new UserAgent({ deviceCategory: 'mobile' }).toString();
  
  try {
    const mailboxesResponse = await fetch('https://api.atomicmail.io/v1/mailboxes', {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        'Origin': 'https://atomicmail.io',
        'Referer': 'https://atomicmail.io/',
        'Authorization': `Bearer ${token}`,
        'Sec-Ch-Ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
        'Sec-Ch-Ua-Mobile': '?1',
        'Sec-Ch-Ua-Platform': '"Android"',
        'Accept-Language': 'en'
      }
    });
    
    const mailboxesData = await mailboxesResponse.json();
    
    if (mailboxesData.success && mailboxesData.results && mailboxesData.results.length > 0) {
      const inbox = mailboxesData.results.find(box => box.path === 'INBOX');
      if (inbox) {
        return inbox.id;
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

const wx = async (token) => {
  const userAgent = new UserAgent({ deviceCategory: 'mobile' }).toString();
  
  try {
    const userResponse = await fetch('https://api.atomicmail.io/v1/users/me', {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        'Origin': 'https://atomicmail.io',
        'Referer': 'https://atomicmail.io/',
        'Authorization': `Bearer ${token}`,
        'Sec-Ch-Ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
        'Sec-Ch-Ua-Mobile': '?1',
        'Sec-Ch-Ua-Platform': '"Android"',
        'Accept-Language': 'en'
      }
    });
    
    const userData = await userResponse.json();
    
    if (userData.success && userData.results) {
      return userData.results.mailbox;
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

const fg = email => {
  if (!email || !email.from || !email.from.address) return false;
  
  const domain = email.from.address.split('@')[1]?.toLowerCase();
  return domain === 'cursor.sh' || domain === 'cursor.com';
};

const hi = text => {
  if (!text) return '';
  
  if (text.length <= 150) return text;
  
  return text.substring(0, 147) + '...';
};

const rs = async (auth, mailboxId, messageId = 4) => {
  const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
  
  try {
    const response = await fetch(`https://atomicmail.io/app/mailbox/${mailboxId}/message/${messageId}?_rsc=ozqz7`, {
      method: 'GET',
      headers: {
        'authority': 'atomicmail.io',
        'method': 'GET',
        'path': `/app/mailbox/${mailboxId}/message/${messageId}?_rsc=ozqz7`,
        'scheme': 'https',
        'accept': '*/*',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'en,en-US;q=0.9,id;q=0.8,zh-TW;q=0.7,zh;q=0.6,ja;q=0.5',
        'cookie': `atomic-token=${auth.token}`,
        'next-router-state-tree': '%5B%22%22%2C%7B%22children%22%3A%5B%22mailbox%22%2C%7B%22children%22%3A%5B%5B%22mailbox%22%2C%22682206fbb21746e137782f46%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fapp%2Fmailbox%2F682206fbb21746e137782f46%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D',
        'priority': 'u=1, i',
        'referer': `https://atomicmail.io/app/mailbox/${mailboxId}`,
        'rsc': '1',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': userAgent
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const text = await response.text();
    
    const codeMatch = text.match(/Your verification code is (\d{6})/);
    if (codeMatch && codeMatch[1]) {
      return codeMatch[1];
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

const kl = async (username, password) => {
  const userAgent = new UserAgent({ deviceCategory: 'mobile' }).toString();
  
  try {
    await uv(username);
    
    const loginResponse = await fetch('https://api.atomicmail.io/v1/auth/sign-in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
        'Origin': 'https://atomicmail.io',
        'Referer': 'https://atomicmail.io/',
        'Authorization': 'Bearer null',
        'Sec-Ch-Ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
        'Sec-Ch-Ua-Mobile': '?1',
        'Sec-Ch-Ua-Platform': '"Android"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'Accept-Language': 'en'
      },
      body: JSON.stringify({
        username,
        password: cd(password)
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (loginData.success && loginData.accessToken) {
      const userId = loginData.id;
      
      await yz(loginData.accessToken);
      
      await bc(loginData.accessToken);
      
      let mailboxId = await de(loginData.accessToken);
      
      if (!mailboxId) {
        mailboxId = await wx(loginData.accessToken);
      }
      
      if (!mailboxId) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const retryMailboxId = await de(loginData.accessToken);
        if (!retryMailboxId) {
          return null;
        }
        
        return {
          token: loginData.accessToken,
          userId,
          mailboxId: retryMailboxId
        };
      }
      
      return {
        token: loginData.accessToken,
        userId,
        mailboxId
      };
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
};

const op = async (auth) => {
  const userAgent = new UserAgent({ deviceCategory: 'mobile' }).toString();
  
  try {
    const emailResponse = await fetch(`https://api.atomicmail.io/v1/mailboxes/${auth.mailboxId}/messages`, {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        'Origin': 'https://atomicmail.io',
        'Referer': 'https://atomicmail.io/',
        'Authorization': `Bearer ${auth.token}`,
        'Sec-Ch-Ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
        'Sec-Ch-Ua-Mobile': '?1',
        'Sec-Ch-Ua-Platform': '"Android"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'Accept-Language': 'en',
        'Cache-Control': 'max-age=0'
      }
    });
    
    if (!emailResponse.ok) {
      return [];
    }
    
    const emailData = await emailResponse.json();
    
    if (emailData.success) {
      if (emailData.results && emailData.results.length > 0) {
        const cursorEmails = emailData.results.filter(fg);
        return cursorEmails;
      }
      return [];
    } else {
      return [];
    }
  } catch (error) {
    return [];
  }
};

const qr = async (auth, lastEmailId) => {
  const emails = await op(auth);
  
  if (emails && emails.length > 0) {
    const latestEmail = emails[0];
    
    if (!lastEmailId || latestEmail.id !== lastEmailId) {
      if (fg(latestEmail)) {
        const code = await rs(auth, auth.mailboxId);
        if (code) {
          return { lastEmailId: latestEmail.id, code };
        }
      }
      
      return { lastEmailId: latestEmail.id, code: null };
    }
  }
  
  return { lastEmailId, code: null };
};

const cr = async (username, password) => {
  const randomPassword = password || `Sazumi@@${Math.floor(Math.random() * 10000)}`;
  const name = `User ${username}`;
  
  const result = await ef(username, randomPassword, name);
  
  if (result) {
    const emailInfo = {
      email: result.address,
      password: result.plainPassword,
      verificationCode: null
    };
    
    return emailInfo;
  }
  
  return null;
};

const mv = async (username, password) => {
  const auth = await kl(username, password);
  
  if (!auth) {
    return null;
  }
  
  let lastEmailId = null;
  let attempts = 0;
  const maxAttempts = 15;
  
  while (attempts < maxAttempts) {
    const result = await qr(auth, lastEmailId);
    lastEmailId = result.lastEmailId;
    
    if (result.code) {
      return result.code;
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;
  }
  
  return null;
};

rt.post('/create', async (req, res) => {
  try {
    const username = ab();
    const emailData = await cr(username);
    
    if (!emailData) {
      return res.json({ 
        success: false, 
        message: 'Change your IP address. Turn off and on your mobile data connection.'
      });
    }
    
    res.json({
      success: true,
      email: emailData.email,
      password: emailData.password
    });
  } catch (error) {
    res.json({ 
      success: false, 
      message: 'Change your IP address. Turn off and on your mobile data connection.'
    });
  }
});

rt.post('/monitor', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.json({ 
        success: false, 
        message: 'Username and password are required'
      });
    }
    
    const code = await mv(username, password);
    
    if (code) {
      res.json({
        success: true,
        verificationCode: code
      });
    } else {
      res.json({
        success: false,
        message: 'Verification code not found. Try changing your IP by toggling mobile data.'
      });
    }
  } catch (error) {
    res.json({ 
      success: false, 
      message: 'Error monitoring for verification code. Try changing your IP address.'
    });
  }
});

export default rt; 