import {DatabaseSync} from 'node:sqlite';
export class Store{
 constructor(path=':memory:'){
  this.db=new DatabaseSync(path,{timeout:5000});this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
  CREATE TABLE IF NOT EXISTS inbox(id TEXT PRIMARY KEY,sender TEXT NOT NULL,text TEXT NOT NULL,stamp INTEGER NOT NULL,received INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'pending',reply TEXT,wa_id TEXT,delivery TEXT);
  CREATE TABLE IF NOT EXISTS operations(id TEXT PRIMARY KEY,device TEXT NOT NULL,action TEXT NOT NULL,source TEXT NOT NULL,at INTEGER NOT NULL,status TEXT NOT NULL,result TEXT,payload TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS inbox_pending ON inbox(status,received);`);
  this.db.prepare("UPDATE operations SET status='uncertain' WHERE status='processing'").run();
  this.db.prepare("UPDATE inbox SET status='uncertain',text='' WHERE status='processing'").run();
 }
 seen(id){return !!this.db.prepare('SELECT id FROM inbox WHERE id=?').get(id);}
 receive(m,now){if(this.seen(m.id))return false;if(this.db.prepare('SELECT count(*) AS n FROM inbox WHERE sender=? AND received>?').get(m.sender,now-60000).n>=10)return false;return this.db.prepare('INSERT OR IGNORE INTO inbox(id,sender,text,stamp,received) VALUES(?,?,?,?,?)').run(m.id,m.sender,m.text,m.stamp,now).changes===1;}
 next(){const m=this.db.prepare("SELECT * FROM inbox WHERE status='pending' ORDER BY received,rowid LIMIT 1").get();if(m)this.db.prepare("UPDATE inbox SET status='processing' WHERE id=? AND status='pending'").run(m.id);return m;}
 finish(id,reply,waId='',delivery='failed'){this.db.prepare("UPDATE inbox SET status='done',text='',reply=?,wa_id=?,delivery=? WHERE id=?").run(reply,waId,delivery,id);}
 expire(id){this.db.prepare("UPDATE inbox SET status='expired',text='' WHERE id=?").run(id);}
 delivery(id,status){if(['sent','delivered','read','failed'].includes(status))this.db.prepare('UPDATE inbox SET delivery=? WHERE wa_id=?').run(status,id);}
 reserve(id,device,action,source,now,payload='null'){return this.db.prepare("INSERT OR IGNORE INTO operations(id,device,action,source,at,status,payload) VALUES(?,?,?,?,?,'processing',?)").run(id,device,action,source,now,payload).changes===1;}
 operation(id){return this.db.prepare('SELECT status,result,device,action,payload FROM operations WHERE id=?').get(id);}
 done(id,result){this.db.prepare('UPDATE operations SET status=?,result=? WHERE id=?').run(result.ok?'confirmed':'failed',JSON.stringify(result),id);}
 audit(){return this.db.prepare('SELECT device,action,source,at,status FROM operations ORDER BY at DESC LIMIT 50').all();}
 summary(){return this.db.prepare('SELECT status,count(*) AS count FROM inbox GROUP BY status').all();}
 purge(now){this.db.prepare('DELETE FROM inbox WHERE received<?').run(now-7*86400000);this.db.prepare('DELETE FROM operations WHERE at<?').run(now-7*86400000);}
 close(){this.db.close();}
}
